# Backend QA Matrix

| Area | Verification |
|---|---|
| Project startup | Spring application context and all 11 repositories load |
| Business rules | Seven rule-specific tests cover payment, access, and reporting |
| API contracts | Account, customer, card, transaction, and user status codes and errors |
| Validation | Keys, dates, monetary fields, lookups, cross-field checks, confirmations, and no-change guards |
| Authentication | BCrypt login succeeds with seeded credentials and rejects invalid passwords |
| Authorization | Anonymous access returns 401 and regular users cannot administer users |
| CSRF | Protected mutations reject missing tokens and accept valid tokens |
| Bill payment | One transaction records the full balance and the account balance becomes zero atomically |
| Reporting | Processing-date filtering, inclusive date bounds, and card ordering |
| Database | Schema creates in H2 and 938 seed statements load on startup |
| Packaging | `mvn clean verify` builds an executable Spring Boot JAR |

The report formatter `CBTRN03C` and search program `COCRDSEC` remain explicit gaps because their source is absent from `main`.
