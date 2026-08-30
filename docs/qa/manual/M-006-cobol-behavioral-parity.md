# M-006 — COBOL behavioral parity

- **Owner:** Modernization lead
- **Status:** BLOCKED
- **Blocker:** An executable COBOL runtime/oracle and resettable baseline input/output fixtures are not available in this repository.

## Prerequisites to unblock
- Versioned COBOL compiler/runtime invocation, immutable baseline datasets, a reset command, and captured outputs for success, validation, authorization, and boundary scenarios.

## Planned review steps after unblocking
1. Reset the same input state for COBOL and the modern service before every scenario.
2. Run the behavioral matrix covering valid operations, missing entities, authorization failures, duplicate/idempotent requests, and boundary money/date conditions.
3. Compare externally observable status, field values, side effects, and report semantics; document only approved deviations.

## Required evidence and decision
- Scenario matrix, reset logs, COBOL and service outputs, diffs, reviewer/date/commit, and approved deviations.
- **Pass:** all scenarios match or have approved documented deviations.
- **Fail:** any unexplained behavioral difference blocks parity sign-off.
