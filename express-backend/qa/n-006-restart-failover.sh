#!/usr/bin/env bash
# Execute an approved command only after proving a disposable test DB and DB-backed endpoint target.
set -euo pipefail
usage(){ cat <<'USAGE'
Usage: TARGET_TEST_DATABASE_URL=... API_BASE_URL=... API_USER_ID=... API_PASSWORD=... DISPOSABLE_TARGET=YES CHANGE_APPROVAL_ID=... APPROVED_COMMAND_FILE=... [DRY_RUN=1] ./n-006-restart-failover.sh
APPROVED_COMMAND_FILE is a reviewed local shell script; inline commands are deliberately not accepted.
The DB-backed /api/accounts endpoint is verified before and after recovery.
USAGE
}
[[ ${1:-} == --help ]] && { usage; exit 0; }
: "${TARGET_TEST_DATABASE_URL:?TARGET_TEST_DATABASE_URL is required.}"; : "${API_BASE_URL:?API_BASE_URL is required.}"; : "${API_USER_ID:?API_USER_ID is required.}"; : "${API_PASSWORD:?API_PASSWORD is required.}"; : "${DISPOSABLE_TARGET:?Set DISPOSABLE_TARGET=YES.}"; : "${CHANGE_APPROVAL_ID:?CHANGE_APPROVAL_ID is required.}"; : "${APPROVED_COMMAND_FILE:?APPROVED_COMMAND_FILE is required.}"; : "${DRY_RUN:=0}"; : "${RECOVERY_TIMEOUT_SECONDS:=120}"; : "${API_ACCOUNT_ID:=00000000001}"; : "${PROBE_INTERVAL_SECONDS:=2}"; : "${MIN_SUCCESSFUL_RECOVERY_PROBES:=3}"
[[ $DISPOSABLE_TARGET == YES && $CHANGE_APPROVAL_ID =~ ^[A-Za-z0-9._-]+$ ]] || { echo 'Refusing: disposable target acknowledgement or approval ID is invalid.' >&2; exit 1; }
[[ -f $APPROVED_COMMAND_FILE && -x $APPROVED_COMMAND_FILE ]] || { echo 'APPROVED_COMMAND_FILE must be an executable reviewed local file.' >&2; exit 1; }
pg_exports(){ python3 <<'PY'
import os,shlex
from urllib.parse import urlparse,unquote
u=urlparse(os.environ['TARGET_URL']); db=unquote(u.path).lstrip('/')
if u.scheme not in ('postgres','postgresql') or not u.hostname or 'test' not in db.lower(): raise SystemExit('Refusing target database: it must be a PostgreSQL test database.')
for k,v in {'PGHOST':u.hostname,'PGPORT':str(u.port or 5432),'PGUSER':unquote(u.username or ''),'PGPASSWORD':unquote(u.password or ''),'PGDATABASE':db}.items(): print(f'export {k}={shlex.quote(v)}')
PY
}
TARGET_URL="${TARGET_TEST_DATABASE_URL}"; export TARGET_URL
eval "$(pg_exports)"
unset TARGET_URL
python3 - "$API_BASE_URL" "$RECOVERY_TIMEOUT_SECONDS" <<'PY'
import sys
from urllib.parse import urlparse
u=urlparse(sys.argv[1])
if u.scheme not in ('http','https') or not u.hostname: raise SystemExit('API_BASE_URL must be absolute http(s).')
if int(sys.argv[2]) < 10: raise SystemExit('RECOVERY_TIMEOUT_SECONDS must be at least 10.')
PY
[[ $PROBE_INTERVAL_SECONDS =~ ^[1-9][0-9]*$ && $MIN_SUCCESSFUL_RECOVERY_PROBES =~ ^[1-9][0-9]*$ ]] || { echo 'Probe interval and required recovery probes must be positive integers.' >&2; exit 1; }
if [[ $DRY_RUN == 1 ]]; then echo "DRY RUN: approval $CHANGE_APPROVAL_ID would record in-flight DB-backed probe outcomes and require $MIN_SUCCESSFUL_RECOVERY_PROBES consecutive recovered probes after $APPROVED_COMMAND_FILE."; exit 0; fi
for tool in psql curl; do command -v "$tool" >/dev/null || { echo "Required command not found: $tool" >&2; exit 1; }; done
actual_db=$(psql -XAtq <<'SQL'
SELECT current_database();
SQL
)
[[ $actual_db == "$PGDATABASE" && $actual_db == *test* ]] || { echo "Target DB identity mismatch: expected $PGDATABASE, got $actual_db." >&2; exit 1; }
cookie=$(mktemp); trap 'rm -f "$cookie"' EXIT
login(){ curl --fail --silent --show-error --max-time 10 -c "$cookie" -H 'Content-Type: application/json' --data "{\"userId\":\"$API_USER_ID\",\"password\":\"$API_PASSWORD\"}" "${API_BASE_URL%/}/api/auth/sign-in" >/dev/null; }
probe(){ curl --fail --silent --show-error --max-time 10 -b "$cookie" "${API_BASE_URL%/}/api/accounts/$API_ACCOUNT_ID" | grep -q '"id"'; }
db_probe(){ local db; db=$(psql -XAtq <<'SQL'
SELECT current_database();
SQL
) && [[ $db == "$actual_db" ]]; }
login && probe && db_probe || { echo 'Pre-disruption DB-backed endpoint probe failed.' >&2; exit 1; }
printf 'Executing reviewed command with approval %s against verified database %s.\n' "$CHANGE_APPROVAL_ID" "$actual_db"
"$APPROVED_COMMAND_FILE"
deadline=$((SECONDS + RECOVERY_TIMEOUT_SECONDS)); consecutive=0; attempts=0; transient_failures=0
while (( SECONDS < deadline )); do
  attempts=$((attempts + 1)); rm -f "$cookie"
  if login && probe && db_probe; then
    consecutive=$((consecutive + 1)); printf 'Recovery probe %s: DB-backed endpoint and DB identity recovered (%s/%s).\n' "$attempts" "$consecutive" "$MIN_SUCCESSFUL_RECOVERY_PROBES"
    if (( consecutive >= MIN_SUCCESSFUL_RECOVERY_PROBES )); then echo "Recovery evidence: $consecutive consecutive DB-backed probes recovered; verified DB identity=$actual_db; transient_failures=$transient_failures."; exit 0; fi
  else
    transient_failures=$((transient_failures + 1)); consecutive=0; printf 'Recovery probe %s: unavailable or database identity not yet recovered.\n' "$attempts" >&2
  fi
  sleep "$PROBE_INTERVAL_SECONDS"
done
echo "Fail: DB-backed endpoint/connection recovery did not achieve $MIN_SUCCESSFUL_RECOVERY_PROBES consecutive probes within ${RECOVERY_TIMEOUT_SECONDS}s (attempts=$attempts transient_failures=$transient_failures)." >&2; exit 1
