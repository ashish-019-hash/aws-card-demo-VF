# Data Model

**Source:** [`business-entities.md`](../business-entities.md) — this page summarizes that
catalog's 11 entities at a glance; for full field lists, PIC clauses, byte offsets,
persisted string formats, and verified source citations, follow the "Full detail" link on
each entity below rather than relying on this summary alone.

## Entity Relationship Diagram

Reproduced from [`business-entities.md`](../business-entities.md#mermaid-er-diagram) for at-a-glance
reference; see that page for the cardinality notes behind each relationship.

```mermaid
erDiagram
    CUSTOMER {
        string CUST_ID PK
        string CUST_FIRST_NAME
        string CUST_LAST_NAME
        string CUST_SSN
        string CUST_DOB
        string CUST_PHONE_NUM_1
        int CUST_FICO_CREDIT_SCORE
    }
    ACCOUNT {
        string ACCT_ID PK
        string ACCT_ACTIVE_STATUS
        decimal ACCT_CURR_BAL
        decimal ACCT_CREDIT_LIMIT
        string ACCT_GROUP_ID FK
    }
    CARD {
        string CARD_NUM PK
        string CARD_ACCT_ID FK
        string CARD_EMBOSSED_NAME
        string CARD_EXPIRAION_DATE
        string CARD_ACTIVE_STATUS
    }
    CARD_XREF {
        string XREF_CARD_NUM PK
        string XREF_CUST_ID FK
        string XREF_ACCT_ID FK
    }
    TRANSACTION {
        string TRAN_ID PK
        string TRAN_CARD_NUM FK
        string TRAN_TYPE_CD FK
        string TRAN_CAT_CD FK
        decimal TRAN_AMT
        string TRAN_ORIG_TS
        string TRAN_PROC_TS
    }
    TRAN_TYPE {
        string TRAN_TYPE PK
        string TRAN_TYPE_DESC
    }
    TRAN_CATEGORY {
        string TRAN_TYPE_CD PK_FK
        string TRAN_CAT_CD PK
        string TRAN_CAT_TYPE_DESC
    }
    TRAN_CAT_BALANCE {
        string TRANCAT_ACCT_ID PK_FK
        string TRANCAT_TYPE_CD PK_FK
        string TRANCAT_CD PK_FK
        decimal TRAN_CAT_BAL
    }
    DISCLOSURE_GROUP {
        string DIS_ACCT_GROUP_ID PK
        string DIS_TRAN_TYPE_CD PK_FK
        string DIS_TRAN_CAT_CD PK_FK
        decimal DIS_INT_RATE
    }
    USER {
        string SEC_USR_ID PK
        string SEC_USR_TYPE
    }

    ACCOUNT ||--o{ CARD : owns
    CUSTOMER ||--o{ CARD_XREF : identified_by
    ACCOUNT ||--o{ CARD_XREF : identified_by
    CARD ||--|| CARD_XREF : cross_referenced_by
    CARD ||--o{ TRANSACTION : originates
    TRAN_TYPE ||--o{ TRANSACTION : classifies
    TRAN_TYPE ||--o{ TRAN_CATEGORY : groups
    TRAN_CATEGORY ||--o{ TRANSACTION : classifies
    ACCOUNT ||--o{ TRAN_CAT_BALANCE : accumulates
    TRAN_CATEGORY ||--o{ TRAN_CAT_BALANCE : categorizes
    TRAN_TYPE ||--o{ DISCLOSURE_GROUP : rates
    TRAN_CATEGORY ||--o{ DISCLOSURE_GROUP : rates
    DISCLOSURE_GROUP }o--|| ACCOUNT : rate_group_for
```

## Entities at a Glance

Each entity below is given its own heading so other wiki pages can link directly to it
(e.g. `data-model.md#account`). For full field lists and source citations, follow the
"Full detail" link.

### Customer

Master entity. Primary key `CUST-ID`. Used by [Account Management](./modules/account-management.md).
Full detail: [`business-entities.md` ENTITY-001](../business-entities.md#entity-001-customer).

### Account

Master entity. Primary key `ACCT-ID`. Used by [Account Management](./modules/account-management.md),
[Card Management](./modules/card-management.md), [Bill Payment](./modules/bill-payment.md).
Full detail: [`business-entities.md` ENTITY-002](../business-entities.md#entity-002-account).

### Card

Master entity. Primary key `CARD-NUM`. Used by [Card Management](./modules/card-management.md),
[Transaction Management](./modules/transaction-management.md).
Full detail: [`business-entities.md` ENTITY-003](../business-entities.md#entity-003-card).

### Card-Account-Customer Cross-Reference

Relationship/junction entity. Primary key `XREF-CARD-NUM`. Used by
[Account Management](./modules/account-management.md), [Card Management](./modules/card-management.md),
[Bill Payment](./modules/bill-payment.md).
Full detail: [`business-entities.md` ENTITY-004](../business-entities.md#entity-004-card-account-customer-cross-reference).

### Transaction

Transactional entity. Primary key `TRAN-ID`. Used by
[Transaction Management](./modules/transaction-management.md), [Bill Payment](./modules/bill-payment.md),
[Transaction Reporting](./modules/reporting.md).
Full detail: [`business-entities.md` ENTITY-005](../business-entities.md#entity-005-transaction).

### Transaction Type

Reference master. Primary key `TRAN-TYPE`. Used by
[Transaction Management](./modules/transaction-management.md), [Transaction Reporting](./modules/reporting.md).
Full detail: [`business-entities.md` ENTITY-006](../business-entities.md#entity-006-transaction-type).

### Transaction Category

Reference master. Primary key `TRAN-CAT-KEY` (type+category). Used by
[Transaction Management](./modules/transaction-management.md), [Transaction Reporting](./modules/reporting.md).
Full detail: [`business-entities.md` ENTITY-007](../business-entities.md#entity-007-transaction-category).

### Transaction Category Balance

Master entity (running summary). Primary key `TRAN-CAT-KEY` (account+type+category). Not
read/written by any online program in the source Phase 1 examined — see
[gap note below](#reference-data-without-an-online-maintenance-program).
Full detail: [`business-entities.md` ENTITY-008](../business-entities.md#entity-008-transaction-category-balance).

### Disclosure Group (Interest Rate Table)

Reference master. Primary key `DIS-GROUP-KEY` (group+type+category). Not read/written by
any online program — see [gap note below](#reference-data-without-an-online-maintenance-program).
Full detail: [`business-entities.md` ENTITY-009](../business-entities.md#entity-009-disclosure-group-interest-rate-table).

### User (Security Profile)

Master entity. Primary key `SEC-USR-ID`. Used by [Sign-On](./modules/sign-on.md),
[User Administration](./modules/user-administration.md).
Full detail: [`business-entities.md` ENTITY-010](../business-entities.md#entity-010-user-security-profile).

### Geographic & Phone Reference Codes

Configuration/value-domain entity, no record structure of its own. Used by
[Account Management](./modules/account-management.md) for state/zip/phone validation.
Full detail: [`business-entities.md` ENTITY-011](../business-entities.md#entity-011-geographic--phone-reference-codes-validation-master-data).

## Reference Data Without an Online Maintenance Program

`business-entities.md` flags that four reference/configuration entities — **Transaction
Type**, **Transaction Category**, **Transaction Category Balance**, and **Disclosure
Group** — have no CICS resource definition and are not `COPY`'d by any online program in
the source tree Phase 1 examined. They are presumably populated by a batch process outside
the scope of what Phase 1 could confirm. See
[Modernization Notes](./modernization-notes.md#carried-forward-gaps) for the consequences.

## Persisted Formats Worth Knowing Before a Rebuild

A few field formats recur across entities and are easy to get wrong when re-modeling:

| Format | Example | Used On |
|---|---|---|
| Date (`YYYY-MM-DD`, 10 chars) | `1961-06-08` | Customer DOB; Account open/expiry/reissue dates; Card expiry date |
| Timestamp (`YYYY-MM-DD HH:MM:SS.SSSSSS`, 26 chars, microsecond precision) | `2022-06-10 19:27:53.000000` | Transaction origination/processing timestamps |
| Phone (`(NNN)NNN-NNNN` left-justified in 15 bytes) | `(908)119-8310  ` | Customer phone numbers 1 and 2 |
| Signed decimal (zoned decimal, sign overpunch in the last byte) | `00000001940{` = +1940.00 | Account balances/limits, Transaction amount, category-balance, interest rate |

Full byte-level detail and additional format notes: see each entity's "Data Structure" and
"Persisted string formats verified against sample data" sections in
[`business-entities.md`](../business-entities.md).

## Related Pages

- [Business Rules & Validation Summary](./business-rules-and-validation.md) — the rules that
  govern how these entities' fields may change
- [Modernization Notes](./modernization-notes.md) — open dependencies on this data model
