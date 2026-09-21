# Glossary

**Source:** merged from [`business-glossary.md`](../business-glossary.md) (24 business
terms) and [`codebase-wiki.md` §7](../codebase-wiki.md#7-glossary) (17 CICS/BMS/VSAM
technical terms). Terms are grouped below rather than duplicated; each definition appears
once. Field-level validation constants (e.g. FICO range 300-850, ZIP format) are **not**
repeated here — see [Business Rules & Validation Summary](./business-rules-and-validation.md)
and [`validation-rules.md`](../validation-rules.md) for those.

## Business & Domain Terms

| Term | Meaning |
|---|---|
| **Admin (Administrator)** | A user account with `USER-TYPE = 'A'`. Routed to the Admin menu after sign-on; has access to the four user-management functions. See [User Types & Roles](./user-types-and-roles.md). |
| **Regular User** | A user account with `USER-TYPE = 'U'`. Routed to the main menu after sign-on; has access to account, card, transaction, bill-payment, and reporting functions. |
| **User Type** | The single field (`SEC-USR-TYPE` / `CDEMO-USER-TYPE`) that determines Admin vs. Regular User. It is the entire authorization model of CardDemo — no additional per-account permission layer exists. |
| **Account** | The credit-account entity — current balance, credit limit, cash-credit limit, current-cycle credit/debit, open/expiry/reissue dates, and account group. See [Data Model](./data-model.md). |
| **Customer** | The person entity associated with an account — name, address, phone, SSN, government ID, date of birth, EFT account, primary-cardholder indicator, FICO score. |
| **Card** | A physical/virtual credit card — 16-digit card number, CVV code, embossed name, expiry date, active status, and the account it belongs to. |
| **Card Cross-Reference** | The junction structure mapping a card number to its owning account and customer (and vice versa via an alternate index). |
| **Transaction** | A single posted movement against an account's balance — Transaction ID, type/category codes, source, description, amount, card number, merchant details, origination/processing timestamps. |
| **Bill Payment** | The single-purpose transaction that pays off an account's entire outstanding balance in one step — always full balance, never partial, and only when the balance is positive. |
| **Confirm Gate (Y/N Confirmation)** | A UI pattern requiring the user to type `Y` to proceed with a consequential action (report submission, bill payment); `N` cancels, anything else is rejected. |
| **PF5 Save/Delete Confirmation** | An alternate confirmation pattern where the pending change is shown read-only and the user must press PF5 specifically to commit it (account update, card update, user delete). |
| **Optimistic Concurrency Check** | Re-reading a record at save time and comparing it against the values originally shown; rejects the save if another process changed the record in the meantime. |
| **No-Op / No-Change Guard** | Refusing a save/update when none of the edited fields actually differ from stored values. |
| **Locked-for-Update Failure** | The outcome when a screen cannot obtain an exclusive lock on a record it needs to change — distinct from a detected optimistic-concurrency conflict. |
| **Transaction ID Generation (MAX+1)** | Finding the current highest Transaction ID by browsing backwards, then adding 1 — not an atomic sequence, and can collide under concurrent use. |
| **Report Period (Monthly / Yearly / Custom)** | The three ways a Transaction Report request can be scoped. |
| **Report Job Submission** | Writing the `TRANREPT` JCL to the CICS internal reader via the `JOBS` transient-data queue so the batch report program runs. |
| **Page Size (List Pagination)** | The fixed row count per page on a list screen: 7 (cards), 10 (transactions), 10 (users). |
| **Filter (Account / Card)** | Optional narrowing criteria on the credit-card list screen; account number, card number, or both (AND semantics). |
| **User ID Uniqueness** | No two user records may share the same User ID — enforced on Add. |
| **Case-Forced Comparison (Sign-On)** | The sign-on screen forces typed credentials to upper case before comparing against the stored password verbatim — a stored password with any lower-case letter can never match. Flagged as a legacy quirk. |
| **Account-Ownership Scoping (absence of)** | CardDemo's user-security record carries no link to a specific Customer or Account ID — any signed-on user can view/edit any account/card/transaction by ID. |
| **Unit of Work (UOW) Rollback** | `EXEC CICS SYNCPOINT ROLLBACK` — undoes all recoverable file changes made so far in the current task if a later step fails. |

## CICS / BMS / VSAM Technical Terms

| Term | Meaning |
|---|---|
| **ACCTDAT** | Account data VSAM file |
| **AIX** | Alternate Index on a VSAM file; access by a secondary key |
| **BMS** | Basic Mapping Support; CICS terminal screen form definition language |
| **CARDDAT** | Credit card data VSAM file |
| **CARDXREF / CCXREF** | Card-to-account cross-reference VSAM file; alternate index via account |
| **CICS** | Customer Information Control System; IBM mainframe transaction-processing monitor |
| **COMMAREA** | Communication area; shared memory passed between CICS programs across screen transitions |
| **CUSTDAT** | Customer master data VSAM file |
| **EIBAID** | Execute Interface Block Attention Identifier; identifies which function key the user pressed |
| **Mapset** | Collection of BMS maps for a single program |
| **Pseudo-conversational** | The CICS programming model used throughout CardDemo: the program ends after sending each screen and is reactivated on the user's next input, rather than holding a session open. See [Architecture & Technology Summary](./architecture.md). |
| **RETURN TRANSID** | CICS command to suspend a program and reactivate it on the next transaction, preserving pseudo-conversational state |
| **Transid** | The 4-character transaction ID (e.g. `CC00`) a user enters to start a CICS program |
| **TRANSACT** | The transaction log VSAM file |
| **USRSEC** | The user security/login VSAM file |
| **VSAM** | Virtual Storage Access Method; IBM mainframe indexed/sequential file format |
| **XCTL** | CICS command for explicit program-to-program transfer that does not return to the caller |

## Related Pages

- [Business Rules & Validation Summary](./business-rules-and-validation.md)
- [Architecture & Technology Summary](./architecture.md)
- [Data Model](./data-model.md)
