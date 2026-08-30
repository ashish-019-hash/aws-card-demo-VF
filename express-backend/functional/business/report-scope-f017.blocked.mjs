import test from 'node:test';

// Specification only: the product has no requester reporting-domain model yet.
// Kept out of executable test scripts so this P0 gap cannot be mistaken for a passing contract.
export const f017ReportScope = {
  catalog: 'F-017',
  status: 'BLOCKED',
  priority: 'P0',
  owner: 'reporting-domain design',
  target: 'Persisted report rows and totals include only transactions in the requester’s authorized reporting domain.',
  currentBehavior: 'Reports persist all-account content while retrieval is enforced owner-only.',
  acceptance: [
    'A requester cannot retrieve another owner’s report.',
    'A requester’s persisted content excludes transactions outside the authorized reporting domain.',
    'Per-account and grand totals are calculated from the authorized rows only.'
  ]
};

test.todo('F-017 BLOCKED/P0 — Owner: reporting-domain design. Target: persist and total only the requester’s authorized reporting domain.');
