# M-004 — Managed DB recovery witness

- **Owner:** Database operations lead
- **Status:** READY_FOR_SIGN_OFF

## Prerequisites
- Approved disposable managed test database, change approval, recovery plan, and independent witness.

## Review steps
1. Witness target account/cluster/database identity and record the approval identifier before disruption.
2. Observe the approved N-006 harness pre-check: test DB identity and authenticated DB-backed endpoint must pass.
3. Witness the approved platform recovery action and record start/end times, platform events, and recovery point objective/result.
4. Witness post-recovery N-006 DB-backed endpoint probe and N-005 restore/reconciliation evidence where applicable.

## Required evidence and decision
- Target identity, approval, witness name, timestamps, platform event IDs, redacted command file hash, and post-recovery evidence.
- **Pass:** approved target only, expected recovery objective met, DB-backed verification succeeds.
- **Fail:** target ambiguity, missing witness/approval, failed recovery objective, or data-integrity discrepancy blocks promotion.
