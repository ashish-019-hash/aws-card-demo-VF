#!/usr/bin/env bash
# Backup and reconcile a test database into a fresh, disposable test-named database only.
set -euo pipefail
usage(){ cat <<'USAGE'
Usage: SOURCE_TEST_DATABASE_URL=... RESTORE_DATABASE_URL=... RESTORE_DATABASE_NAME=... CONFIRM_DISPOSABLE_RESTORE=YES NONPROD_TARGET=YES [RESTORED_API_SMOKE=YES RESTORED_API_BASE_URL=... RESTORED_API_USER_ID=... RESTORED_API_PASSWORD=...] [DRY_RUN=1] ./n-005-backup-restore.sh
The restore database may not exist. It is the only database this script creates or drops.
API smoke is optional but, when enabled, must target an application explicitly configured to use RESTORE_DATABASE_URL.
USAGE
}
[[ ${1:-} == --help ]] && { usage; exit 0; }
: "${SOURCE_TEST_DATABASE_URL:?SOURCE_TEST_DATABASE_URL is required.}"; : "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required.}"; : "${RESTORE_DATABASE_NAME:?RESTORE_DATABASE_NAME is required.}"; : "${CONFIRM_DISPOSABLE_RESTORE:?Set CONFIRM_DISPOSABLE_RESTORE=YES.}"; : "${NONPROD_TARGET:?Set NONPROD_TARGET=YES.}"; : "${DRY_RUN:=0}"; : "${BACKUP_ARTIFACT_DIR:=artifacts}"; : "${RESTORED_API_SMOKE:=NO}"
[[ $CONFIRM_DISPOSABLE_RESTORE == YES && $NONPROD_TARGET == YES ]] || { echo 'Refusing without explicit disposable/non-production acknowledgements.' >&2; exit 1; }
[[ $RESTORED_API_SMOKE == NO || $RESTORED_API_SMOKE == YES ]] || { echo 'RESTORED_API_SMOKE must be YES or NO.' >&2; exit 1; }
parse_url(){ TARGET_URL=$1 python3 <<'PY'
import os,shlex
from urllib.parse import urlparse,unquote
u=urlparse(os.environ['TARGET_URL']); db=unquote(u.path).lstrip('/')
if u.scheme not in ('postgres','postgresql') or not u.hostname or 'test' not in db.lower(): raise SystemExit('All targets must be PostgreSQL databases named with "test".')
for k,v in {'PGHOST':u.hostname,'PGPORT':str(u.port or 5432),'PGUSER':unquote(u.username or ''),'PGPASSWORD':unquote(u.password or ''),'PGDATABASE':db}.items(): print(f'export {k}={shlex.quote(v)}')
PY
}
eval "$(parse_url "$SOURCE_TEST_DATABASE_URL")"; source_db=$PGDATABASE; source_host=$PGHOST; source_port=$PGPORT; source_user=$PGUSER; source_password=$PGPASSWORD
eval "$(parse_url "$RESTORE_DATABASE_URL")"; restore_db=$PGDATABASE; restore_host=$PGHOST; restore_port=$PGPORT; restore_user=$PGUSER; restore_password=$PGPASSWORD
[[ $restore_db == "$RESTORE_DATABASE_NAME" && $source_db != "$restore_db" ]] || { echo 'Restore identity invalid: source/restore must differ and restore name must match its URL.' >&2; exit 1; }
tmpfiles=(); cleanup(){ if ((${#tmpfiles[@]})); then rm -f "${tmpfiles[@]}"; fi; }; trap cleanup EXIT
if [[ $DRY_RUN == 1 ]]; then echo "DRY RUN: would dump $source_db and only recreate/reconcile fresh restore DB $restore_db; API smoke=$RESTORED_API_SMOKE."; exit 0; fi
for tool in psql pg_dump pg_restore dropdb createdb sha256sum diff; do command -v "$tool" >/dev/null || { echo "Required command not found: $tool" >&2; exit 1; }; done
export PGHOST=$source_host PGPORT=$source_port PGUSER=$source_user PGPASSWORD=$source_password PGDATABASE=$source_db
actual=$(psql -XAtq <<'SQL'
SELECT current_database();
SQL
); [[ $actual == "$source_db" && $actual == *test* ]] || { echo 'Source database identity guard failed.' >&2; exit 1; }
mkdir -p "$BACKUP_ARTIFACT_DIR"; dump="$BACKUP_ARTIFACT_DIR/$restore_db.dump"; manifest="$BACKUP_ARTIFACT_DIR/$restore_db.contents.txt"
pg_dump --format=custom --no-owner --file="$dump"; sha256sum "$dump" | tee "$dump.sha256"; pg_restore --list "$dump" | tee "$manifest" >/dev/null
source_snapshot=$(mktemp); source_schema=$(mktemp); restore_snapshot=$(mktemp); restore_schema=$(mktemp); tmpfiles=("$source_snapshot" "$source_schema" "$restore_snapshot" "$restore_schema")
psql -XAtq <<'SQL' > "$source_snapshot"
SELECT 'migration|' || string_agg(name, ',' ORDER BY name) FROM schema_migrations
UNION ALL SELECT 'table|' || table_name || '|' || (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I','public',table_name),false,true,'')))[1]::text FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'
UNION ALL SELECT 'sequence|' || schemaname || '.' || sequencename || '|' || coalesce(last_value::text,'NULL') FROM pg_sequences WHERE schemaname='public' ORDER BY 1;
SQL
pg_dump --schema-only --no-owner > "$source_schema"
export PGHOST=$restore_host PGPORT=$restore_port PGUSER=$restore_user PGPASSWORD=$restore_password PGDATABASE=postgres
dropdb --if-exists --maintenance-db=postgres "$restore_db"; createdb --maintenance-db=postgres "$restore_db"
export PGDATABASE=$restore_db; pg_restore --exit-on-error --no-owner --dbname="$restore_db" "$dump"
actual=$(psql -XAtq <<'SQL'
SELECT current_database();
SQL
); [[ $actual == "$restore_db" && $actual == *test* ]] || { echo 'Restore database identity guard failed.' >&2; exit 1; }
pg_dump --schema-only --no-owner > "$restore_schema"; diff -u "$source_schema" "$restore_schema"
psql -XAtq <<'SQL' > "$restore_snapshot"
SELECT 'migration|' || string_agg(name, ',' ORDER BY name) FROM schema_migrations
UNION ALL SELECT 'table|' || table_name || '|' || (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I','public',table_name),false,true,'')))[1]::text FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'
UNION ALL SELECT 'sequence|' || schemaname || '.' || sequencename || '|' || coalesce(last_value::text,'NULL') FROM pg_sequences WHERE schemaname='public' ORDER BY 1;
SQL
diff -u "$source_snapshot" "$restore_snapshot"
psql -XAtq <<'SQL' | grep -q '^[0-9][0-9]*$' || { echo 'Restored database smoke query failed.' >&2; exit 1; }
SELECT count(*) FROM users;
SQL
if [[ $RESTORED_API_SMOKE == YES ]]; then
  : "${RESTORED_API_BASE_URL:?RESTORED_API_BASE_URL is required when RESTORED_API_SMOKE=YES.}"; : "${RESTORED_API_USER_ID:?RESTORED_API_USER_ID is required.}"; : "${RESTORED_API_PASSWORD:?RESTORED_API_PASSWORD is required.}"
  command -v curl >/dev/null || { echo 'curl is required for RESTORED_API_SMOKE.' >&2; exit 1; }
  cookie=$(mktemp); tmpfiles+=("$cookie")
  curl --fail --silent --show-error -c "$cookie" -H 'Content-Type: application/json' --data "{\"userId\":\"$RESTORED_API_USER_ID\",\"password\":\"$RESTORED_API_PASSWORD\"}" "${RESTORED_API_BASE_URL%/}/api/auth/sign-in" >/dev/null
  curl --fail --silent --show-error -b "$cookie" "${RESTORED_API_BASE_URL%/}/api/accounts/00000000001" | grep -q '"id"' || { echo 'Restored-app smoke failed; verify the API is configured with RESTORE_DATABASE_URL.' >&2; exit 1; }
fi
echo "Backup/restore reconciliation passed: checksum, restore list, schema/migration/row/sequence reconciliation, database smoke, API smoke=$RESTORED_API_SMOKE for $restore_db."
