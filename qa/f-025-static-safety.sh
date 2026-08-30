#!/usr/bin/env bash
# Static operational readiness gate; it does not contact application or database targets.
set -euo pipefail
repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd); failures=0
fail(){ printf 'FAIL: %s\n' "$*" >&2; failures=$((failures+1)); }
need(){ [[ -f "$repo_root/$1" ]] || fail "missing $1"; }
has(){ grep -Eq -- "$2" "$repo_root/$1" || fail "$1 missing: $2"; }
no(){ grep -Eq -- "$2" "$repo_root/$1" && fail "$1 contains forbidden pattern: $2" || true; }
for f in express-backend/qa/*.sh; do bash -n "$repo_root/$f" || fail "$f bash syntax"; done
node --input-type=module --check < "$repo_root/qa/n-001-api-load.js" || fail 'N-001 JavaScript syntax'
node --input-type=module --check < "$repo_root/express-backend/qa/n-003-pool-saturation.js" || fail 'N-003 JavaScript syntax'
for f in qa/n-001-api-load.js express-backend/qa/n-003-pool-saturation.js; do has "$f" 'auth/sign-in'; has "$f" 'api/(transactions|reports)'; no "$f" 'GET.*\/health'; done
has express-backend/qa/n-002-query-plan.sh 'ANALYZE, BUFFERS, FORMAT JSON'; has express-backend/qa/n-002-query-plan.sh 'expected_index'
has express-backend/qa/n-004-managed-db-tls.sh 'PGSSLMODE=verify-full'; has express-backend/qa/n-004-managed-db-tls.sh 'PGSSLROOTCERT'; has express-backend/qa/n-004-managed-db-tls.sh 'Wrong-CA'; has express-backend/qa/n-004-managed-db-tls.sh 'Wrong-hostname'
has express-backend/qa/n-004-managed-db-tls.sh 'DB_SSL_REJECT_UNAUTHORIZED:-true'; has express-backend/qa/n-004-managed-db-tls.sh 'NODE_TLS_REJECT_UNAUTHORIZED:-1'
has express-backend/qa/n-005-backup-restore.sh 'pg_restore --list'; has express-backend/qa/n-005-backup-restore.sh 'sha256sum'; has express-backend/qa/n-006-restart-failover.sh 'APPROVED_COMMAND_FILE'; has express-backend/qa/n-006-restart-failover.sh 'api/accounts'; no express-backend/qa/n-006-restart-failover.sh 'bash -c'

# Scan tracked (plus non-ignored untracked) source/config only. This deliberately excludes
# generated assets, dependencies, fixtures, test code, and prose, while retaining a high-
# confidence credential detector for executable application/configuration content.
source_files=()
while IFS= read -r -d '' file; do
  case "$file" in
    express-backend/src/*|angular-frontend/src/*|express-backend/*.json|express-backend/*.yaml|express-backend/*.yml|angular-frontend/*.json|angular-frontend/*.yaml|angular-frontend/*.yml)
      case "$file" in *.spec.*|*/test/*|*/functional/*) ;; *) source_files+=("$repo_root/$file") ;; esac ;;
  esac
done < <(cd "$repo_root" && git ls-files -z --cached --others --exclude-standard)
credential_pattern='AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|((DATABASE_URL|[A-Z0-9_]*(TOKEN|SECRET|PASSWORD))[[:space:]]*[:=][[:space:]]*"[A-Za-z0-9/+_=.-]{16,}")'
if ((${#source_files[@]})) && grep -nE "$credential_pattern" "${source_files[@]}"; then
  fail 'high-confidence credential found in tracked source/config'
fi

# Detect executable insecure TLS settings, not explanatory documentation mentioning them.
if ((${#source_files[@]})) && grep -nE '(rejectUnauthorized[[:space:]]*:[[:space:]]*false|DB_SSL_REJECT_UNAUTHORIZED[[:space:]]*=[[:space:]]*false|NODE_TLS_REJECT_UNAUTHORIZED[[:space:]]*=[[:space:]]*0)' "${source_files[@]}"; then
  fail 'executable insecure TLS setting found in source/config'
fi
has express-backend/src/db.js "DB_SSL_REJECT_UNAUTHORIZED !== 'false'"
# Test jobs must use an explicit test-database guard and may not inject a development/default DATABASE_URL.
if ! node --input-type=module - "$repo_root" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
let unsafe = false;
for (const relative of ['express-backend/package.json', 'angular-frontend/package.json']) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
  for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
    if (!/(^|:)(test|e2e)(:|$)/.test(name)) continue;
    if (/DATABASE_URL\s*=/.test(command) && !/TEST_DATABASE_URL|test-db\.js|isolated-test-db|db-lifecycle/.test(command)) {
      console.error(`${relative} script ${name} injects DATABASE_URL without an isolated-test guard: ${command}`);
      unsafe = true;
    }
    if (/postgres(?:ql)?:\/\/[^\s"']*\/(?![^\s"']*test)[^\s"']*/i.test(command)) {
      console.error(`${relative} script ${name} embeds a non-test PostgreSQL default: ${command}`);
      unsafe = true;
    }
  }
}
process.exitCode = unsafe ? 1 : 0;
NODE
then fail 'unsafe test-job command or default database detected'; fi
has express-backend/openapi.yaml '/api/auth/sign-in'; has express-backend/openapi.yaml '/api/reports'; has express-backend/src/app.js "app.get\('/api/accounts/:accountId'"; has express-backend/src/app.js "app.post\('/api/reports'"
if grep -RInE --exclude-dir=node_modules --exclude-dir=.git '(console\.(log|error|warn)|logger\.).*(DATABASE_URL|PGPASSWORD|password|secret|token|authorization)' "$repo_root/express-backend/src"; then fail 'sensitive value may reach application log'; fi
source_routes=$(grep -Eo "app\.(get|post|patch|delete)\('[^']+" "$repo_root/express-backend/src/app.js" | sed -E "s/.*'//" | sort -u)
while IFS= read -r route; do [[ -z $route || $route == *':'* ]] && continue; grep -Fq "$route" "$repo_root/express-backend/openapi.yaml" || fail "route absent from OpenAPI inventory: $route"; done <<< "$source_routes"
if command -v npm >/dev/null; then
  # Bound audit to production dependencies and high/critical findings. Registry unavailability
  # is surfaced as a gate failure rather than silently skipped.
  for project in express-backend angular-frontend; do
    timeout 120 npm --prefix "$repo_root/$project" audit --omit=dev --audit-level=high || fail "$project production dependency audit (high/critical, 120s bound)"
  done
  (cd "$repo_root/angular-frontend" && npm run build -- --configuration production) || fail 'Angular production build'
else fail 'npm unavailable for dependency audit and Angular build'; fi
if ((failures)); then printf 'F-025 failed with %d issue(s).\n' "$failures" >&2; exit 1; fi
echo 'F-025 static safety, inventory, dependency-build, and syntax checks passed.'
