# M-002 — CSRF deployment review

- **Owner:** Security/platform lead
- **Status:** READY_FOR_SIGN_OFF

## Prerequisites
- Deployment ingress configuration, cookie attributes, browser-origin policy, and threat model.

## Review steps
1. Confirm session cookies are `HttpOnly`, `Secure` in production, and `SameSite=Strict` (or document an approved exception).
2. Confirm state-changing endpoints cannot be reached cross-site under the deployed origin/proxy configuration.
3. Review CORS, `TRUST_PROXY`, HTTPS termination, redirects, and any cross-origin frontend requirement.
4. Perform browser negative tests from an untrusted origin and retain browser/network evidence.

## Required evidence and decision
- Redacted headers, ingress/CORS configuration, browser negative-test output, reviewer/date/commit.
- **Pass:** deployment controls enforce the documented CSRF posture.
- **Fail:** cookie/proxy/origin configuration enables an unmitigated cross-site mutation; block deployment.
