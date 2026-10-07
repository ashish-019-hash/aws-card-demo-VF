# Business Glossary — CardDemo (Legacy COBOL/CICS)

Plain-language definitions of the business terms and concepts encountered while extracting business rules from the checked-out working tree (branch `vorflux/migrate-carddemo-spring-react`). Each term cites where it is defined or used in the source.

---

## Parties and Access

**User (Application User)** — A person who signs on to CardDemo. Identified by an 8-character user ID with name, password, and role held on the user security file. (`00.phase-1-input/cpy/CSUSR01Y.cpy`, lines 17–22)

**User Role / User Type** — A one-character code on each user's security record that determines what the user may do: `A` = Administrator, `U` = Regular user. Admins manage users; regular users work with accounts, cards, transactions, reports, and bill payment. (`00.phase-1-input/cpy/COCOM01Y.cpy`, lines 26–28; routing in `00.phase-1-input/cbl/COSGN00C.cbl`, lines 227–240)

**Admin-Only Function** — A menu function flagged with required role `A`; regular users selecting it are refused. The security functions (user list/add/update/delete) live on the admin menu. (`00.phase-1-input/cbl/COMEN01C.cbl`, lines 136–144; `00.phase-1-input/cpy/COADM02Y.cpy`, lines 19–42)

**Customer** — The holder of an account/card. Customer master data (name, address, SSN, date of birth, FICO score) is held on the customer file. (`00.phase-1-input/cpy/CVCUS01Y.cpy`; also `CUSTREC.cpy`)

---

## Accounts

**Account** — The credit-card account: the unit against which balances, limits, and transactions are tracked. Keyed by an 11-digit Account ID. (`00.phase-1-input/cpy/CVACT01Y.cpy`, lines 4–16)

**Account Active Status** — A Y/N flag indicating whether the account is open for use. (`CVACT01Y.cpy`, line 6)

**Current Balance** — The amount currently owed on the account (signed; can be negative when the account is in credit). It is the amount settled in full by a bill payment. (`CVACT01Y.cpy`, line 7; used in `COBIL00C.cbl`, lines 193–234)

**Credit Limit** — The maximum total credit extended on the account. (`CVACT01Y.cpy`, line 8)

**Cash Credit Limit** — The portion of the credit limit available for cash advances. (`CVACT01Y.cpy`, line 9)

**Current Cycle Credit / Current Cycle Debit** — Running totals of credits and debits posted in the current billing cycle. (`CVACT01Y.cpy`, lines 13–14)

**Account Open / Expiration / Reissue Dates** — Lifecycle dates of the account relationship. (`CVACT01Y.cpy`, lines 10–12)

**Account Group ID** — A grouping code used to associate an account with a product/portfolio grouping (e.g., for interest/disclosure treatment). (`CVACT01Y.cpy`, line 16)

---

## Cards

**Credit Card** — The physical/virtual card issued against an account: 16-digit card number with embossed name, expiry date, CVV, and active status. (`00.phase-1-input/cpy/CVACT02Y.cpy`)

**Card Active Status** — Y/N flag showing whether the card can be used. (`CVACT02Y.cpy`; maintained via `COCRDUPC.cbl`)

**Card–Account Cross-Reference (XREF)** — The link between a card number, its customer, and its account. Bill payments use it to find which card to charge for a given account. (`00.phase-1-input/cpy/CVACT03Y.cpy`, lines 4–7; used in `COBIL00C.cbl`, lines 211 and 225)

---

## Transactions

**Transaction** — A single financial event on a card: amount, classification, merchant details, card number, and timestamps. Keyed by a 16-character Transaction ID. (`00.phase-1-input/cpy/CVTRA05Y.cpy`, lines 4–17)

**Transaction Type Code** — A 2-character code classifying the kind of transaction. Online bill payments are always type `02`. (`CVTRA05Y.cpy`, line 6; `COBIL00C.cbl`, line 220; type master file layout `CVTRA03Y.cpy`)

**Transaction Category Code** — A numeric sub-classification within a type, used for categorizing activity (e.g., for cycle totals). Bill payments are always category `2`. (`CVTRA05Y.cpy`, line 7; `COBIL00C.cbl`, line 221; category master layout `CVTRA04Y.cpy`)

**Transaction Source** — Where the transaction entered the system (e.g., `POS TERM` for online bill payments). (`CVTRA05Y.cpy`, line 8; `COBIL00C.cbl`, line 222)

**Merchant** — The counterparty of a transaction (ID, name, city, ZIP). Bill payments use the reserved internal merchant `999999999` / `BILL PAYMENT`. (`CVTRA05Y.cpy`, lines 11–14; `COBIL00C.cbl`, lines 226–229)

**Origination Timestamp vs. Processing Timestamp** — When the transaction occurred versus when the system processed/posted it. Reports select transactions by the *processing* date. (`CVTRA05Y.cpy`, lines 16–17; `00.phase-1-input/proc/TRANREPT.prc`, lines 40, 45–46)

---

## Payments

**Bill Payment** — The online function by which a customer settles their account. It always pays the full current balance, requires explicit Y/N confirmation, is only permitted when a positive balance is owed, and posts a type-`02` transaction while reducing the account balance to zero. (`00.phase-1-input/cbl/COBIL00C.cbl`, lines 172–240)

**Payment Confirmation** — The explicit `Y` entry a customer must give, after seeing the balance due, before a bill payment moves money; `N` cancels. (`COBIL00C.cbl`, lines 172–191, 210, 236–240)

---

## Reporting

**Transaction Report** — A customer-requested report of card transactions for a period, produced by a batch job submitted from the online screen. Content is selected by processing date within the period and presented in card-number order. (`00.phase-1-input/cbl/CORPT00C.cbl`; `00.phase-1-input/proc/TRANREPT.prc`, lines 44–46)

**Report Period** — The date range a report covers. *Monthly* = the current calendar month (1st through last day, computed correctly for month length); *Yearly* = the current calendar year (Jan 1 – Dec 31); *Custom* = customer-entered start and end dates, inclusive. (`CORPT00C.cbl`, lines 213–255 and 429–436)

---

## Session and Navigation Concepts (business-relevant)

**Sign-On** — Entry to the application; on success the user's role is attached to the session and drives routing and entitlements. (`00.phase-1-input/cbl/COSGN00C.cbl`, lines 223–240)

**Main Menu vs. Admin Menu** — The two role-specific entry points: the main menu offers the ten customer-operations functions; the admin menu offers the four user-security functions. (`00.phase-1-input/cpy/COMEN02Y.cpy`, lines 19–93; `00.phase-1-input/cpy/COADM02Y.cpy`, lines 19–42)
