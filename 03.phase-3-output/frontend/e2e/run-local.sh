#!/usr/bin/env bash
set -euo pipefail

# This command owns a disposable in-memory H2 backend. It never reuses a listener.
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
backend_dir="$repo_root/02.phase-2-output/backend"
container_name="carddemo-e2e-backend-$$"
port=${E2E_BACKEND_PORT:-8080}
startup_timeout=${E2E_STARTUP_TIMEOUT_SECONDS:-120}
maven_cache=${MAVEN_CACHE_DIR:-"$HOME/.m2"}

if ! [[ "$port" =~ ^[0-9]+$ ]] || ((port < 1 || port > 65535)); then
  echo "E2E_BACKEND_PORT must be a valid TCP port; received '$port'." >&2
  exit 2
fi
if ! [[ "$startup_timeout" =~ ^[0-9]+$ ]] || ((startup_timeout < 1)); then
  echo "E2E_STARTUP_TIMEOUT_SECONDS must be a positive integer; received '$startup_timeout'." >&2
  exit 2
fi
if ! command -v docker >/dev/null || ! docker info >/dev/null 2>&1; then
  echo "Docker must be installed and running to start the disposable E2E backend." >&2
  exit 2
fi
if [[ ! -d "$backend_dir" ]]; then
  echo "Backend directory was not found: $backend_dir" >&2
  exit 2
fi

port_is_listening() {
  if command -v ss >/dev/null; then
    ss -ltnH "sport = :$port" 2>/dev/null | grep -q .
  elif command -v lsof >/dev/null; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    # Bash's TCP probe is only a fallback when no listener inspection tool exists.
    (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
  fi
}

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

if port_is_listening; then
  echo "Port $port already has a listener. e2e:local requires an unused port for a fresh seeded backend." >&2
  exit 1
fi

mkdir -p "$maven_cache"
npm run e2e:check
docker run --rm -d --name "$container_name" -p "$port:8080" \
  -e TZ=UTC \
  -v "$backend_dir":/workspace -v "$maven_cache":/root/.m2 \
  -w /workspace maven:3.9.9-eclipse-temurin-21 \
  mvn spring-boot:run -Dspring-boot.run.arguments="--carddemo.database.reset=true" >/dev/null

for ((elapsed = 0; elapsed < startup_timeout; elapsed += 2)); do
  if curl --fail --silent "http://127.0.0.1:$port/v3/api-docs" >/dev/null; then
    TZ=UTC E2E_API_BASE_URL="http://127.0.0.1:$port" E2E_RESET_BOUNDARY=fresh-container npx playwright test
    exit $?
  fi
  sleep 2
done

echo "Backend did not become ready within ${startup_timeout}s." >&2
docker logs "$container_name" >&2
exit 1
