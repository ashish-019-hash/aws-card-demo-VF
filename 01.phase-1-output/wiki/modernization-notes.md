# Modernization Notes

**Source:** synthesized from the "Observed / Recommended correction" flags in
[`business-rules-catalog.md`](../business-rules-catalog.md), the "Open Dependencies / Gaps"
section of [`business-entities.md`](../business-entities.md#open-dependencies--gaps), the
"Open Questions / Gaps" section of [`codebase-wiki.md`](../codebase-wiki.md#8-open-questions--gaps),
and the validation-rules gap note in
[`validation-rules.md`](../validation-rules.md#17-add-user--cousr01c-screen-cousr01--txn-cu01).
Nothing on this page is speculation beyond what those documents already flagged.

## Legacy Quirks to Deliberately Reproduce or Deliberately Fix (Not Silently Carry Over)

These are documented in `business-rules-catalog.md` as **observed** behavior, explicitly
not silently corrected there — a rebuild needs to make a conscious choice about each:

| Quirk | Module | Consequence if unaddressed |
|---|---|---|
| Sign-on forces the typed password to upper case but compares against the stored password verbatim (BR-001) | [Sign-On](./modules/sign-on.md) | Any stored password containing a lower-case letter can never be matched — a silent permanent lockout |
| The "Admin Only" menu gate exists but no option is flagged for it (BR-003) | [Menu Navigation](./modules/menu-navigation.md) | If Transaction Add (or another option) was meant to be admin-restricted, it currently isn't |
| Card List resets session user-type to "Regular User" on entry/exit (BR-004) | [Card Management](./modules/card-management.md) | Latent authorization-state hazard if this screen is ever reached by an Admin session |
| No account-ownership scoping anywhere in the system (BR-005) | All modules | Any signed-on user can view/edit any account, card, or transaction by ID — a deliberate new design decision is needed if a rebuild wants per-customer scoping |
| Account Update's optimistic-concurrency check doesn't refresh its comparison baseline after a detected conflict (BR-007) | [Account Management](./modules/account-management.md) | Worth confirming end-to-end during a rebuild; Card Update's equivalent check (BR-009) *does* refresh its baseline, so the two modules are inconsistent today |
| Transaction-ID assignment is MAX+1 via reverse browse, not an atomic sequence — concurrent adds can race and the loser gets a user-facing duplicate-key error (BR-010) | [Transaction Management](./modules/transaction-management.md), [Bill Payment](./modules/bill-payment.md) | A rebuild should decide whether to reproduce this exact contract (including the user-visible duplicate error) or replace it with an atomic generator — but that's a deliberate choice, not an incidental implementation detail |
| Passwords are stored in clear text on the User entity, with no hashing observed (`business-entities.md` ENTITY-010) | [User Administration](./modules/user-administration.md), [Sign-On](./modules/sign-on.md) | A security posture a modernized system should very likely not carry over |

## Carried-Forward Gaps

These are gaps Phase 1 could not resolve from the source material available to it —
flagged rather than guessed at:

1. **`CBTRN03C` batch program is missing.** Referenced by the `TRANREPT` JCL (which the
   Transaction Reporting screen triggers) but not found in the source tree. Exactly how the
   report is formatted, and whether/how the Transaction Category Balance and Disclosure
   Group entities get populated, cannot be confirmed from source. See
   [Transaction Reporting](./modules/reporting.md#what-happens-after-submission-batch) and
   [Data Model](./data-model.md#reference-data-without-an-online-maintenance-program).
2. **Four reference/configuration entities have no online maintenance program**:
   Transaction Type, Transaction Category, Transaction Category Balance, and Disclosure
   Group. No CICS resource definition and no `COPY` of their record layouts was found in
   any online program. A modernized system needs its own answer for how these get
   populated/maintained.
3. **`ACCT-GROUP-ID` ↔ `DIS-ACCT-GROUP-ID` is a naming/shape match, not a verified
   enforced relationship** — no program was found joining Account to Disclosure Group; the
   foreign key in [Data Model](./data-model.md) is asserted from identical field
   definition only.
4. **User (Security Profile) is `COPY`'d into five programs that never reference its
   fields** (COACTUPC, COACTVWC, COCRDLIC, COCRDSLC, COCRDUPC) — no audit/last-changed-by
   linkage from Account/Card to User was found in source, despite the copy statement
   suggesting one might once have been intended.
5. **Add User doesn't validate its User Type code value** (`A`/`U`) at entry time — see
   [User Administration](./modules/user-administration.md#validation-rules-summary).
6. **A developer-only screen (`COCRDSEC` / transaction `CDV1`)** exists in the CICS
   resource table but isn't reachable from any menu and isn't part of the documented
   end-user experience — see [Component Inventory](./component-inventory.md#excluded-from-end-user-documentation).

## Modules With Unusually Dense Rule Coverage

[Account Management](./modules/account-management.md) accounts for 49 of the 130
cataloged validation rules (nearly 40%) plus 3 of the 16 business rules — by far the
densest module in the system. A rebuild should expect its validation layer (dates, SSN,
FICO, US state/zip/phone cross-checks) to take proportionally more implementation and test
effort than any other module.

## Related Pages

- [Business Rules & Validation Summary](./business-rules-and-validation.md)
- [Data Model](./data-model.md)
- [Architecture & Technology Summary](./architecture.md)
