#!/usr/bin/env bash
set -euo pipefail
root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
catalog="$root/qa/automation-catalog.md"
if [[ ${1:-} == --check ]]; then
  mapfile -t ids < <(grep -Eo '^\| (U|F|E|N|M)-[0-9]{3} \|' "$catalog" | sed -E 's/^\| ([A-Z]-[0-9]{3}) \|/\1/' | sort)
  expected=(U-001 U-002 U-003 U-004 U-005 U-006 U-007 U-008 U-009)
  for n in $(seq 1 25); do printf -v id 'F-%03d' "$n"; expected+=("$id"); done
  for n in $(seq 1 8); do printf -v id 'E-%03d' "$n"; expected+=("$id"); done
  for prefix in N M; do for n in $(seq 1 7); do printf -v id "${prefix}-%03d" "$n"; expected+=("$id"); done; done
  mapfile -t expected < <(printf '%s\n' "${expected[@]}" | sort)
  [[ ${#ids[@]} -eq 56 ]] || { echo "Expected 56 catalog IDs, found ${#ids[@]}." >&2; exit 1; }
  diff -u <(printf '%s\n' "${expected[@]}") <(printf '%s\n' "${ids[@]}")
  echo 'Catalog traceability check passed: all 56 IDs are present exactly once.'
  exit 0
fi
cat "$catalog"
