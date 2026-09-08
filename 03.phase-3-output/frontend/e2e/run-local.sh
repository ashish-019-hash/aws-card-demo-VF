#!/usr/bin/env bash
set -euo pipefail

# The in-memory H2 database is rebuilt from immutable legacy extracts for every E2E run.
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
backend_dir="$repo_root/02.phase-2-output/backend"
container_name="carddemo-e2e-backend-$$"

cleanup() {
  docker rm -f "$container_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if curl --fail --silent http://127.0.0.1:8080/v3/api-docs >/dev/null; then
  echo "Port 8080 is already serving a backend. Stop it before e2e:local so this run can use a fresh seed." >&2
  exit 1
fi

docker run --rm -d --name "$container_name" -p 8080:8080 \
  -v "$backend_dir":/workspace -w /workspace \
  maven:3.9.9-eclipse-temurin-21 \
  mvn spring-boot:run -Dspring-boot.run.arguments="--carddemo.database.reset=true" >/dev/null

for _ in $(seq 1 60); do
  if curl --fail --silent http://127.0.0.1:8080/v3/api-docs >/dev/null; then
    npx playwright test
    exit $?
  fi
  sleep 2
done

docker logs "$container_name" >&2
exit 1
