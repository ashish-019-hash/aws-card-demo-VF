# Manual QA Scenario Data

This guide uses the deterministic development seed, which is loaded from the immutable fixed-width extracts. It documents test scenarios only; it does not alter production seed resources.

## Start, access, and reset

From `02.phase-2-output/backend`, start a clean local instance:

```bash
docker run --rm -p 8080:8080 -v "$PWD":/workspace -w /workspace \
  maven:3.9.9-eclipse-temurin-21 mvn spring-boot:run \
  -Dspring-boot.run.arguments="--carddemo.database.reset=true"
```

Authenticate before protected operations, then obtain a CSRF token for mutations:

```bash
curl -sS -c cookies.txt -X POST http://localhost:8080/api/session \
  -H 'Content-Type: application/json' \
  -d '{"userId":"ADMIN001","password":"ADMIN123"}'
curl -sS -b cookies.txt -c cookies.txt http://localhost:8080/api/csrf
TOKEN=$(awk '$6 == "XSRF-TOKEN" {print $7}' cookies.txt)
```

Use `-b cookies.txt -H "X-XSRF-TOKEN: $TOKEN"` on each state-changing request. Stop and restart the container with `--carddemo.database.reset=true` to restore the exact baseline.

| User ID | Password | Role | Use |
|---|---|---|---|
| `ADMIN001` | `ADMIN123` | Administrator (`A`) | User administration and all protected API scenarios |
| `USER0001` | `USER123` | Standard user (`U`) | Standard-user session/menu scenario |

## Fixed-width seed baseline

| Scenario data | Values / expected result |
|---|---|
| Account/card relationship | Account `1` starts with current balance `194.00`. Card `0500024453765740` belongs to account `50`. |
| Transaction seed | 300 transactions. Every bundled seed processing timestamp is blank, so seed transactions are excluded from reports. Seed origin timestamps retain full `YYYY-MM-DD HH:mm:ss.SSSSSS` values. |
| Payment configuration | Type/category `02`/`2` supports the `BILL PAYMENT - ONLINE` workflow. A confirmed payment for account `1` creates one payment transaction for the full current balance and leaves the account at `0.00`. |
| Transaction capture configuration | Type/category `01`/`1` supports a normal captured transaction. New transactions retain date-only `YYYY-MM-DD` origin and processing values, while payments use full timestamps. |
| Customer-format reference | Customer data retains fixed-width phone values in `(NNN)NNN-NNNN`, DOB in `YYYY-MM-DD`, and SSN as 9 digits. Preserve those shapes in update requests. |

## Manual scenarios

### Account and customer maintenance — STORY-005 / RULE-VAL-003–013

1. Retrieve the current resource, retaining the returned account values and both version fields:

   ```bash
   curl -sS -b cookies.txt http://localhost:8080/api/accounts/1 > account.json
   ```

2. For an account-only mutation, copy every account field from `account.json`, change one field such as `currentBalance`, and include its current `version` as `expectedAccountVersion`. Submit the complete object to `PUT /api/accounts/1`. Expected: `200`, `{"changed":true}`, and the changed value appears in a subsequent GET.
3. For a customer mutation, begin with the complete returned `customer` object. Keep every field unchanged except one valid target field (for example, `middleName`), retain the returned `customer.version` as `expectedCustomerVersion`, and include the current account fields plus `expectedAccountVersion`. The nested `customer` object must include all required fields because its validation applies to the full customer request. Expected: `200`, `{"changed":true}` and the updated customer field appears on a subsequent GET.
4. Re-submit an unchanged complete account/customer request with refreshed versions. Expected: `400 NO_CHANGES`. Omit `expectedAccountVersion` or, for a customer mutation, `expectedCustomerVersion`. Expected: `400 EXPECTED_VERSION_REQUIRED`.
5. Starting from the complete valid customer object, alter one value at a time to `6175551212`, `1980/01/01`, or `12345678`. Expected: field-specific `RULE-VAL-011`, `RULE-VAL-005`, or `RULE-VAL-012`; no update is saved.

### Card update — STORY-008 / RULE-VAL-017–020

1. `GET /api/cards/0500024453765740` and retain `version`.
2. Submit a changed alphabetic `embossedName`, `activeStatus` `Y`, expiry `2028-12-01`, and the recorded `expectedVersion`. Expected: `200`, changed `true`.
3. Resubmit unchanged fields with the refreshed version. Expected: `400 NO_CHANGES`.
4. Test `QA-1` for the name and `2100-12-01` for expiry separately. Expected: field-specific `RULE-VAL-017` and `RULE-VAL-020` errors.

### Transaction capture and reports — STORY-011 / STORY-017–018

Create three confirmed transactions with otherwise valid type/category `01`/`1` data and these processing dates: `2097-06-15`, `2097-06-16`, and `2097-06-17`. Use a valid transaction date value in `YYYY-MM-DD` form for each origin/processing date.

```json
{"accountId":1,"transactionTypeCode":"01","transactionCategoryCode":1,"source":"POS","description":"Manual QA purchase","amount":"10.00","merchantId":1,"merchantName":"QA Shop","merchantCity":"Boston","merchantZip":"02108","originDate":"2097-06-16","processingDate":"2097-06-16","confirmation":"Y"}
```

- Request `GET /api/reports/transactions?startDate=2097-06-16&endDate=2097-06-16`. Expected: only the middle transaction is returned; report bounds are inclusive.
- Change `amount` to `1.001`, `merchantId` to `-1`, or `source` to empty. Expected: field-specific `RULE-VAL-033`, `RULE-VAL-035`, or `RULE-VAL-031`; no transaction is created.
- Change either date to `2026-02-30` or `not-a-date`. Expected: `400 INVALID_REQUEST`; no transaction is created. This generic response is an HTTP JSON-to-`LocalDate` mapping gap: the malformed value is rejected before `RULE-VAL-034` can provide a field-specific error.

### Payment and user lifecycle — STORY-012 / STORY-014–016

- Pay account `1` with `{"confirmation":"Y"}`. Expected: `PAID`, paid amount `194.00`, balance `0.00`, and a `BILL PAYMENT - ONLINE` transaction. Repeating the request at zero balance must return `400 NOTHING_TO_PAY` with no new transaction.
- Create `EDGE0001` with nonblank first name, last name, password, and user type `U`; immediately submit the same user details to `PUT /api/users/EDGE0001`. Expected: `400 NO_CHANGES`. Delete it explicitly with `DELETE /api/users/EDGE0001`; GET then returns `404 USER_NOT_FOUND`.
- Attempt to create a user with an empty required field. Expected: field-specific `RULE-VAL-023` and no user creation.
