#!/usr/bin/env bash
# Read-only test-environment health, retention index, scheduler, and log-redaction checks.
set -euo pipefail
usage(){ cat <<'USAGE'
Usage: TEST_DATABASE_URL=... API_BASE_URL=... NONPROD_TARGET=YES [CLEANUP_SCHEDULER_EVIDENCE_FILE=path] [LOG_REDACTION_EVIDENCE_FILE=path] [RETENTION_DAYS=90] [MAX_EXPIRED_ROWS=0] [DRY_RUN=1] ./n-007-observability-retention.sh
Evidence files are reviewed locally for scheduler fields and obvious secret-bearing log content; no log platform is contacted.
USAGE
}
[[ ${1:-} == --help ]] && { usage; exit 0; }
: "${TEST_DATABASE_URL:?TEST_DATABASE_URL is required; DATABASE_URL is refused.}"; : "${API_BASE_URL:?API_BASE_URL is required.}"; : "${NONPROD_TARGET:?Set NONPROD_TARGET=YES.}"; : "${DRY_RUN:=0}"; : "${RETENTION_DAYS:=90}"; : "${MAX_EXPIRED_ROWS:=0}"; : "${CLEANUP_SCHEDULER_EVIDENCE_FILE:=}"; : "${LOG_REDACTION_EVIDENCE_FILE:=}"
[[ $NONPROD_TARGET == YES ]] || { echo 'Refusing: NONPROD_TARGET must equal YES.' >&2; exit 1; }
eval "$(TARGET_URL=$TEST_DATABASE_URL python3 <<'PY'
import os,shlex
from urllib.parse import urlparse,unquote
u=urlparse(os.environ['TARGET_URL']); db=unquote(u.path).lstrip('/')
if u.scheme not in ('postgres','postgresql') or 'test' not in db.lower(): raise SystemExit('Refusing non-test PostgreSQL target.')
for k,v in {'PGHOST':u.hostname,'PGPORT':str(u.port or 5432),'PGUSER':unquote(u.username or ''),'PGPASSWORD':unquote(u.password or ''),'PGDATABASE':db}.items(): print(f'export {k}={shlex.quote(v)}')
PY
)"
python3 - "$API_BASE_URL" "$RETENTION_DAYS" "$MAX_EXPIRED_ROWS" <<'PY'
import sys
from urllib.parse import urlparse
if urlparse(sys.argv[1]).scheme not in ('http','https'): raise SystemExit('API_BASE_URL must be absolute http(s).')
for v in sys.argv[2:]:
 if int(v)<0: raise SystemExit('Retention values must be non-negative.')
PY
for f in "$CLEANUP_SCHEDULER_EVIDENCE_FILE" "$LOG_REDACTION_EVIDENCE_FILE"; do [[ -z $f || -f $f ]] || { echo "Evidence file does not exist: $f" >&2; exit 1; }; done
if [[ $DRY_RUN == 1 ]]; then echo 'DRY RUN: would read health/indexes/stale rows and validate supplied scheduler/redaction evidence files.'; exit 0; fi
for tool in psql curl; do command -v "$tool" >/dev/null || { echo "Required command not found: $tool" >&2; exit 1; }; done
actual=$(psql -XAtq <<'SQL'
SELECT current_database();
SQL
); [[ $actual == "$PGDATABASE" && $actual == *test* ]] || { echo 'Database identity guard failed.' >&2; exit 1; }
curl --fail --silent --show-error --max-time 5 "${API_BASE_URL%/}/health" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"' || { echo 'Health endpoint did not report ok.' >&2; exit 1; }
indexes=$(psql -XAtq <<'SQL'
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('sessions_expiry_idx','idempotency_retention_idx','reports_retention_idx') ORDER BY 1;
SQL
); for index in sessions_expiry_idx idempotency_retention_idx reports_retention_idx; do grep -qx "$index" <<<"$indexes" || { echo "Missing retention index: $index" >&2; exit 1; }; done
expired=$(psql -XAtq <<SQL
SELECT (SELECT count(*) FROM sessions WHERE expires_at < now() - interval '${RETENTION_DAYS} days') + (SELECT count(*) FROM idempotency WHERE created_at < now() - interval '${RETENTION_DAYS} days') + (SELECT count(*) FROM reports WHERE created_at < now() - interval '${RETENTION_DAYS} days');
SQL
); [[ $expired =~ ^[0-9]+$ && $expired -le $MAX_EXPIRED_ROWS ]] || { echo "Expired rows $expired exceed $MAX_EXPIRED_ROWS." >&2; exit 1; }
if [[ -n $CLEANUP_SCHEDULER_EVIDENCE_FILE ]]; then grep -Eqi '(schedule|cron).*(cleanup)|cleanup.*(schedule|cron)' "$CLEANUP_SCHEDULER_EVIDENCE_FILE" && grep -Eqi '(last.*success|last.*run|completed)' "$CLEANUP_SCHEDULER_EVIDENCE_FILE" || { echo 'Scheduler evidence lacks schedule and successful-run fields.' >&2; exit 1; }; fi
if [[ -n $LOG_REDACTION_EVIDENCE_FILE ]] && grep -Eqi '(authorization:[[:space:]]*bearer|password[=:][^[:space:]]|postgres(ql)?://[^[:space:]]+@|PGPASSWORD=|session(id)?[=:][A-Za-z0-9._-]{12,})' "$LOG_REDACTION_EVIDENCE_FILE"; then echo 'Log-redaction evidence contains a likely sensitive value.' >&2; exit 1; fi
echo "Observability/retention checks passed: database=$actual expired_rows=$expired scheduler_evidence=${CLEANUP_SCHEDULER_EVIDENCE_FILE:+checked} log_redaction_evidence=${LOG_REDACTION_EVIDENCE_FILE:+checked}."
