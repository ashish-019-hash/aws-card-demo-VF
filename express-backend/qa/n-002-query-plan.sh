#!/usr/bin/env bash
# Capture executed, buffer-aware plans from an acknowledged seeded test database.
set -euo pipefail
usage(){ cat <<'USAGE'
Usage: TEST_DATABASE_URL=... NONPROD_TARGET=YES [DRY_RUN=1] ./n-002-query-plan.sh
Optional: PLAN_OUTPUT=artifacts/query-plans.json MAX_TOTAL_COST=1000. EXPLAIN ANALYZE executes read-only SELECTs.
USAGE
}
[[ ${1:-} == --help ]] && { usage; exit 0; }
: "${TEST_DATABASE_URL:?TEST_DATABASE_URL is required; DATABASE_URL is refused.}"; : "${NONPROD_TARGET:?Set NONPROD_TARGET=YES after confirming the target is non-production.}"; : "${DRY_RUN:=0}"; : "${PLAN_OUTPUT:=artifacts/query-plans.json}"; : "${MAX_TOTAL_COST:=1000}"
[[ $NONPROD_TARGET == YES ]] || { echo 'Refusing: NONPROD_TARGET must equal YES.' >&2; exit 1; }
pg_exports(){ python3 <<'PY'
import os,shlex
from urllib.parse import urlparse,unquote
u=urlparse(os.environ['TARGET_URL']); db=unquote(u.path).lstrip('/')
if u.scheme not in ('postgres','postgresql') or not u.hostname or 'test' not in db.lower(): raise SystemExit('Refusing non-test PostgreSQL target.')
for k,v in {'PGHOST':u.hostname,'PGPORT':str(u.port or 5432),'PGUSER':unquote(u.username or ''),'PGPASSWORD':unquote(u.password or ''),'PGDATABASE':db}.items(): print(f'export {k}={shlex.quote(v)}')
PY
}
TARGET_URL="$TEST_DATABASE_URL"; export TARGET_URL; eval "$(pg_exports)"; unset TARGET_URL
python3 - "$MAX_TOTAL_COST" <<'PY'
import sys
try: assert float(sys.argv[1]) > 0
except: raise SystemExit('MAX_TOTAL_COST must be positive.')
PY
if [[ $DRY_RUN == 1 ]]; then echo "DRY RUN: would execute read-only EXPLAIN ANALYZE BUFFERS FORMAT JSON on seeded values through psql stdin and write $PLAN_OUTPUT."; exit 0; fi
command -v psql >/dev/null || { echo 'Required command not found: psql' >&2; exit 1; }
actual_db=$(psql -XAtq <<'SQL'
SELECT current_database();
SQL
); [[ $actual_db == "$PGDATABASE" && $actual_db == *test* ]] || { echo "Refusing: selected database $actual_db differs from guarded target." >&2; exit 1; }
# Fixture values must exist; assertions protect against misleading empty-table plans.
psql -Xv ON_ERROR_STOP=1 <<'SQL' >/dev/null
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM cards WHERE account_id='00000000001') THEN RAISE EXCEPTION 'seeded cards account value missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM transactions WHERE card_number='4859452612877065') THEN RAISE EXCEPTION 'seeded transaction card value missing'; END IF;
 IF NOT EXISTS (SELECT 1 FROM reports WHERE owner_id='USER0001') THEN RAISE EXCEPTION 'seeded report owner value missing; create a fixture report before capture'; END IF;
END $$;
SQL
mkdir -p "$(dirname "$PLAN_OUTPUT")"
{
  printf '{\n'; first=1
  while IFS='|' read -r name query; do
    [[ $first == 1 ]] || printf ',\n'; first=0; printf '  "%s": ' "$name"
    psql -XAtq <<SQL
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) $query;
SQL
  done <<'QUERIES'
cards_by_account|SELECT number FROM cards WHERE account_id = '00000000001' ORDER BY number LIMIT 10
transactions_by_card|SELECT id FROM transactions WHERE card_number = '4859452612877065' ORDER BY id LIMIT 10
reports_by_owner|SELECT id FROM reports WHERE owner_id = 'USER0001' ORDER BY created_at DESC LIMIT 10
QUERIES
  printf '\n}\n'
} > "$PLAN_OUTPUT"
python3 - "$PLAN_OUTPUT" "$MAX_TOTAL_COST" <<'PY'
import json,sys
plans=json.load(open(sys.argv[1])); limit=float(sys.argv[2]); expected={'cards_by_account':'cards_account_number_idx','transactions_by_card':'transactions_card_id_idx','reports_by_owner':'reports_owner_idx'}
def nodes(v):
 if isinstance(v,dict):
  yield v
  for x in v.values(): yield from nodes(x)
 elif isinstance(v,list):
  for x in v: yield from nodes(x)
for name,result in plans.items():
 plan=result[0]['Plan']; indexes={n.get('Index Name') for n in nodes(plan) if n.get('Index Name')}; cost=float(plan['Total Cost']); buffers=[n.get('Shared Hit Blocks') for n in nodes(plan) if 'Shared Hit Blocks' in n]
 if cost > limit: raise SystemExit(f'{name}: total cost {cost} exceeds {limit}')
 if expected[name] not in indexes: raise SystemExit(f'{name}: expected index {expected[name]} not used; saw {sorted(indexes)}')
 if not buffers: raise SystemExit(f'{name}: buffer statistics missing')
 print(f'{name}: expected_index={expected[name]} total_cost={cost} shared_hit_blocks={sum(buffers)}')
PY
echo "Captured executed seeded-value plans in $PLAN_OUTPUT"
