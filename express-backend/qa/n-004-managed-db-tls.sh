#!/usr/bin/env bash
# Verify libpq verify-full TLS and intentional wrong-CA/hostname failures against a test DB.
set -euo pipefail
usage(){ cat <<'USAGE'
Usage: MANAGED_TEST_DATABASE_URL=... DB_SSL_CA_FILE=/path/ca.pem NONPROD_TARGET=YES [TLS_WRONG_HOST=...] [DRY_RUN=1] ./n-004-managed-db-tls.sh
Uses PGSSLMODE=verify-full and PGSSLROOTCERT. It rejects insecure sslmode and rejectUnauthorized=false settings.
USAGE
}
[[ ${1:-} == --help ]] && { usage; exit 0; }
: "${MANAGED_TEST_DATABASE_URL:?MANAGED_TEST_DATABASE_URL is required.}"; : "${DB_SSL_CA_FILE:?DB_SSL_CA_FILE is required.}"; : "${NONPROD_TARGET:?Set NONPROD_TARGET=YES for an approved test resource.}"; : "${DRY_RUN:=0}"
[[ $NONPROD_TARGET == YES ]] || { echo 'Refusing: NONPROD_TARGET must equal YES.' >&2; exit 1; }
[[ -f $DB_SSL_CA_FILE ]] || { echo "Missing CA file: $DB_SSL_CA_FILE" >&2; exit 1; }
[[ ${DB_SSL_REJECT_UNAUTHORIZED:-true} != false && ${NODE_TLS_REJECT_UNAUTHORIZED:-1} != 0 ]] || { echo 'Refusing insecure certificate-verification override.' >&2; exit 1; }
pg_exports(){ python3 <<'PY'
import os,shlex
from urllib.parse import urlparse,unquote
u=urlparse(os.environ['TARGET_URL']); db=unquote(u.path).lstrip('/')
if u.scheme not in ('postgres','postgresql') or not u.hostname or 'test' not in db.lower(): raise SystemExit('Refusing non-test PostgreSQL target.')
for k,v in {'PGHOST':u.hostname,'PGPORT':str(u.port or 5432),'PGUSER':unquote(u.username or ''),'PGPASSWORD':unquote(u.password or ''),'PGDATABASE':db}.items(): print(f'export {k}={shlex.quote(v)}')
PY
}
TARGET_URL="${MANAGED_TEST_DATABASE_URL}"; export TARGET_URL
eval "$(pg_exports)"
unset TARGET_URL
: "${TLS_WRONG_HOST:?TLS_WRONG_HOST is required: a DNS alias for this test endpoint that is intentionally absent from its certificate.}"
if [[ $DRY_RUN == 1 ]]; then echo 'DRY RUN: would run verified TLS, wrong-CA, and wrong-hostname negative checks using PGSSLMODE/PGSSLROOTCERT.'; exit 0; fi
command -v psql >/dev/null || { echo 'Required command not found: psql' >&2; exit 1; }
export PGSSLMODE=verify-full PGSSLROOTCERT="$DB_SSL_CA_FILE"
psql -Xv ON_ERROR_STOP=1 -Atq <<'SQL' | grep -q '^TLS_OK:' || { echo 'Verified TLS session was not active.' >&2; exit 1; }
SELECT CASE WHEN ssl AND version IS NOT NULL THEN 'TLS_OK:' || version ELSE 'TLS_NOT_ACTIVE' END FROM pg_stat_ssl WHERE pid=pg_backend_pid();
SQL
actual_db=$(psql -XAtq <<'SQL'
SELECT current_database();
SQL
)
[[ $actual_db == *test* ]] || { echo "Refusing: server selected non-test database $actual_db." >&2; exit 1; }
wrong_ca=$(mktemp); trap 'rm -f "$wrong_ca"' EXIT; printf 'not a trusted CA\n' > "$wrong_ca"
if PGSSLROOTCERT="$wrong_ca" psql -XAtq </dev/null 2>/dev/null; then echo 'Wrong-CA negative check unexpectedly connected.' >&2; exit 1; fi
if PGHOST="$TLS_WRONG_HOST" PGSSLROOTCERT="$DB_SSL_CA_FILE" psql -XAtq </dev/null 2>/dev/null; then echo 'Wrong-hostname negative check unexpectedly connected.' >&2; exit 1; fi
echo "TLS validation passed for test database $actual_db; wrong-CA and wrong-hostname connections failed as required."
