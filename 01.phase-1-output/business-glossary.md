# CardDemo — Business Glossary

Plain-language definitions of the business terms and concepts encountered while extracting
the Business Rules Catalog (`business-rules-catalog.md`). Technical/CICS plumbing terms
(BMS, COMMAREA, XCTL, VSAM, etc.) are already covered in the codebase wiki's glossary
(`codebase-wiki.md`, section 7) and are not repeated here unless a business rule depends on
understanding them.

| Term | Meaning |
|------|---------|
| **Admin (Administrator)** | A user account with `USER-TYPE = 'A'`. Routed to the Admin menu after sign-on; has access to the four user-management functions (list, add, update, delete users). See BR-002. |
| **Regular User** | A user account with `USER-TYPE = 'U'`. Routed to the main menu after sign-on; has access to account, card, transaction, bill-payment, and reporting functions. See BR-002. |
| **User Type** | The single field (`SEC-USR-TYPE` / `CDEMO-USER-TYPE`) that determines whether a signed-on account is an Admin or a Regular User. It is the entire authorization model of CardDemo — there is no additional per-account or per-customer permission layer (see BR-005). |
| **Account** | The credit-account entity (`ACCTDAT`/`CVACT01Y`) — carries current balance, credit limit, cash-credit limit, current-cycle credit/debit, open/expiry/reissue dates, and account group. Identified by an 11-digit Account ID. |
| **Customer** | The person entity (`CUSTDAT`/`CVCUS01Y`) associated with an account — name, address, phone, SSN, government ID, date of birth, EFT account, primary-cardholder indicator, FICO credit score. Identified by a 9-digit Customer ID. |
| **Card** | A physical/virtual credit card (`CARDDAT`/`CVCRD01Y`) — 16-digit card number, CVV code, embossed name, expiry date, active status, and the account it belongs to. |
| **Card Cross-Reference (CARDXREF / CXACAIX)** | The lookup structure that maps a card number to its owning account (and vice-versa via an alternate index), used whenever a screen needs "which account does this card belong to" or "which cards belong to this account." |
| **Transaction** | A single posted movement against an account's balance (`TRANSACT`) — has a Transaction ID, type code, category code, source, description, amount, associated card number, merchant details, and origination/processing timestamps. New transactions get their ID via the MAX+1 pattern in BR-010. |
| **Bill Payment** | The single-purpose transaction created by `COBIL00C` that pays off an account's entire outstanding balance in one step — always for the full balance, never partial (BR-012), and only when the balance is positive (BR-011). |
| **Confirm Gate (Y/N Confirmation)** | A UI pattern used before an irreversible or consequential action (report submission in `CORPT00C`, bill payment in `COBIL00C`) where the user must explicitly type `Y` to proceed; `N` cancels; anything else is rejected as invalid. Contrast with the PF5-key confirmation pattern used for saves/deletes (see below). |
| **PF5 Save/Delete Confirmation** | An alternate confirmation pattern (no dedicated Y/N field) where the screen first shows the pending change/target record read-only, and the user must press the PF5 function key specifically to commit it (used by account update, card update, and user delete). Pressing Enter alone never commits these changes. |
| **Optimistic Concurrency Check** | The pattern (BR-007, BR-009) where a screen shows a record's values, the user edits them, and — only at save time — the program re-reads the live record and compares it against the values that were originally shown. If the live record no longer matches (someone else changed it in the meantime), the save is rejected rather than silently overwriting the other change. |
| **No-Op / No-Change Guard** | The pattern (BR-006, part of BR-016) where a save/update is refused if none of the edited fields actually differ from their current stored values — prevents pointless writes and unnecessary record locking. |
| **Locked-for-Update Failure** | The outcome when a screen cannot obtain an exclusive read-lock on a record it needs to change (e.g. another task already holds it) — surfaced to the user as an inability to save, distinct from "someone changed it" (which requires the lock to have first been obtained successfully). |
| **Transaction ID Generation (MAX+1)** | The technique (BR-010) of finding the current highest Transaction ID by browsing the `TRANSACT` file backwards from the highest possible key, then adding 1, used both for manually-added transactions and for bill-payment transactions. Not a database sequence/counter — a computed value derived at write time, which can collide under concurrent use (surfaced to the user as a duplicate-key error rather than silently retried). |
| **Report Period (Monthly / Yearly / Custom)** | The three ways a user can scope a Transaction Report request (BR-013): Monthly = 1st through last day of the current calendar month; Yearly = Jan 1 through Dec 31 of the current year; Custom = any user-supplied start/end date range, validated by the shared date-utility program. |
| **Report Job Submission** | The act of writing the `TRANREPT` JCL to the CICS internal reader (via the `JOBS` transient-data queue) so the mainframe job scheduler will run the batch report program. Only happens after the user confirms with `Y` (BR-013). |
| **Page Size (List Pagination)** | The fixed number of rows shown per page on a browsable list screen: 7 for the credit-card list, 10 for the transaction list, and 10 for the user list (BR-015). Each screen determines whether a further page exists by reading one extra record past the current page without displaying it. |
| **Filter (Account / Card)** | Optional, user-supplied narrowing criteria on the credit-card list screen (BR-014): an account-number filter, a card-number filter, or both together (AND semantics). Leaving both blank browses every card in the system. |
| **User ID Uniqueness** | The rule that no two `USRSEC` records may share the same User ID — enforced by the VSAM key on Add (BR-016), surfaced to the operator as "User ID already exist..." rather than allowing a silent overwrite. |
| **Case-Forced Comparison (Sign-On)** | The observed (and questionable) behavior where the User ID and Password typed at sign-on are forced to upper case before being used, while the *stored* password on file is compared byte-for-byte as-is — meaning a stored password containing any lower-case letter can never be matched (BR-001). Flagged as a legacy quirk, not a designed business rule. |
| **Account-Ownership Scoping (absence of)** | The observation that CardDemo's `USRSEC` user-security record carries no link to a specific Customer ID or Account ID, so any signed-on user (of either type) can view or edit any account/card/transaction by supplying its ID — there is no "this is my account" restriction anywhere in the legacy system (BR-005). |
| **Unit of Work (UOW) Rollback** | The CICS mechanism (`EXEC CICS SYNCPOINT ROLLBACK`) that undoes all recoverable file changes made so far within the current task if a later step fails — used in account update (BR-008) to undo an already-successful account-file rewrite if the paired customer-file rewrite then fails, keeping the two files consistent with each other. |

## Notes on Scope

This glossary intentionally excludes purely technical/validation terms (e.g. "FICO score
range 300–850," "ZIP first-5 numeric," "date format YYYY-MM-DD") — those are field-level
validation rules and are catalogued separately by the validation-rules extraction pass, not
here. It also excludes CICS/BMS/VSAM infrastructure terms already defined in
`codebase-wiki.md`.
