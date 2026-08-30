# M-005 — Legacy semantic review

- **Owner:** Product/domain lead
- **Status:** READY_FOR_SIGN_OFF

## Prerequisites
- Legacy COBOL source/map artifacts, product requirements, API/UI behavior matrix, and automated functional evidence.

## Review steps
1. Review account/card/transaction/billing/report semantics against the legacy program names and supplied fixed-format inputs.
2. Verify dates, leading-zero identifiers, blank values, money rounding, idempotency, and report-period behavior with representative examples.
3. Review known intentional deviations and get product/domain approval for each.
4. Record source artifact version, examples inspected, open discrepancies, and decision.

## Required evidence and decision
- Signed semantic matrix, example inputs/outputs with sensitive values redacted, automated evidence links, and approved deviation list.
- **Pass:** every material behavior is mapped or explicitly approved as a deviation.
- **Fail:** an unmapped or unapproved semantic change blocks release.
