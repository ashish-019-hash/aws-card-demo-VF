# M-007 — COBOL byte/report parity

- **Owner:** Modernization lead
- **Status:** BLOCKED
- **Blocker:** Byte-level COBOL report/output baselines, code-page definition, and runnable generation job are unavailable.

## Prerequisites to unblock
- Captured COBOL output files, record-length/layout specification, encoding/code-page declaration, normalization policy (if any), and a reproducible report-generation command.

## Planned review steps after unblocking
1. Reset inputs and generate reports from both implementations for each approved scenario.
2. Check byte count, line/record termination, encoding, field positions, padding, sign/decimal representation, leading zeros, ordering, and page/header/trailer controls.
3. Run `cmp`/`diff` on raw artifacts before applying any approved normalization; retain hashes and mismatch offsets.

## Required evidence and decision
- Raw output artifacts, SHA-256 hashes, byte-level diff results, record-layout checklist, and approved exceptions.
- **Pass:** raw artifacts match byte-for-byte, or every intentional difference is signed off.
- **Fail:** any unexplained byte, report ordering, or formatting difference blocks parity sign-off.
