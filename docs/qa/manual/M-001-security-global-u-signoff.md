# M-001 — Security global-U sign-off

- **Owner:** Security lead
- **Status:** READY_FOR_SIGN_OFF

## Prerequisites
- Current API deployment candidate, `openapi.yaml`, global-U policy requirements, and completed automated authorization evidence.

## Review steps
1. Review every business endpoint and confirm it requires the U role; confirm administrative endpoints require A.
2. Execute representative authenticated U, A, and unauthenticated requests for each route group; retain status/code evidence.
3. Confirm user/session changes revoke or deny stale authorization as specified.
4. Record reviewer, commit SHA, date, exceptions, and decision.

## Required evidence and decision
- Route-to-role matrix, automated test link/output, redacted request results, and reviewer sign-off.
- **Pass:** no unauthorized business/admin access and all exceptions are approved.
- **Fail:** any role boundary bypass, missing route evidence, or unapproved exception blocks release.
