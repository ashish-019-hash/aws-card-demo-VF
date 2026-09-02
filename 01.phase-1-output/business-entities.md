# Business Entity Catalog

This catalog is derived from persisted record layouts, supplied data extracts, CICS file definitions, and the COBOL programs that use them. `FILLER`, map fields, work areas, report formats, and the duplicate daily-transaction transfer layout (`CVTRA06Y`) are excluded. The latter has the same business fields as `TRAN-RECORD` and is treated as a physical intake representation, not a separate business entity.

The operational master files are defined as CICS datasets in `00.phase-1-input/csd/CARDDEMO.CSD` lines 1-99. The additional configuration and balance datasets are present in the supplied catalog (`00.phase-1-input/catlg/LISTCAT.txt` lines 859-885, 1334-1360, 1440-1465, and 3742-3767) and their supplied ASCII extracts.

### ENTITY-001: Customer

**Entity Type**: Master  
**Description**: A person whose identity, contact information, payment-account reference, primary-card-holder indicator, and credit score are maintained by the card system.  
**Source**: `00.phase-1-input/cpy/CVCUS01Y.cpy`, lines 4-23; persisted as CUSTDAT in `00.phase-1-input/csd/CARDDEMO.CSD`, lines 50-62.

**Business Attributes**:
- Primary Key: `CUST-ID`
- Core Attributes: name, postal address (including city), phone numbers, SSN, government-issued ID, date of birth, EFT account ID, and FICO credit score
- Foreign Keys: None stored directly
- Status Fields: `CUST-PRI-CARD-HOLDER-IND` identifies primary-card-holder status

**Data Structure**:

| Field | Data Type | Description | Key |
|---|---|---|---|
| CUST-ID | PIC 9(09) | Customer identifier | PK |
| CUST-FIRST-NAME | PIC X(25) | First name | — |
| CUST-MIDDLE-NAME | PIC X(25) | Middle name | — |
| CUST-LAST-NAME | PIC X(25) | Last name | — |
| CUST-ADDR-LINE-1 | PIC X(50) | Address line 1 | — |
| CUST-ADDR-LINE-2 | PIC X(50) | Address line 2 | — |
| CUST-ADDR-LINE-3 | PIC X(50) | City (displayed as City and mapped to `ACSCITY`) | — |
| CUST-ADDR-STATE-CD | PIC X(02) | State code | — |
| CUST-ADDR-COUNTRY-CD | PIC X(03) | Country code | — |
| CUST-ADDR-ZIP | PIC X(10) | Postal code | — |
| CUST-PHONE-NUM-1 | PIC X(15) | Primary phone; persisted format `(NNN)NNN-NNNN` | — |
| CUST-PHONE-NUM-2 | PIC X(15) | Secondary phone; persisted format `(NNN)NNN-NNNN` | — |
| CUST-SSN | PIC 9(09) | Nine-digit Social Security number | — |
| CUST-GOVT-ISSUED-ID | PIC X(20) | Government-issued identification | — |
| CUST-DOB-YYYY-MM-DD | PIC X(10) | Date of birth; persisted format `YYYY-MM-DD` | — |
| CUST-EFT-ACCOUNT-ID | PIC X(10) | Electronic-funds-transfer account reference | — |
| CUST-PRI-CARD-HOLDER-IND | PIC X(01) | Primary-card-holder indicator | — |
| CUST-FICO-CREDIT-SCORE | PIC 9(03) | FICO credit score | — |

**Persisted Representations**:
- `CUST-ADDR-LINE-3` is the city: the view program moves it to `ACSCITYO` (`00.phase-1-input/cbl/COACTVWC.cbl`, lines 511-518), the update program accepts `ACSCITYI` into the field (`00.phase-1-input/cbl/COACTUPC.cbl`, lines 1329-1333), and both account maps label the field “City” (`00.phase-1-input/bms/COACTUP.bms`, lines 388-395; `00.phase-1-input/bms/COACTVW.bms`, lines 297-303).
- `CUST-PHONE-NUM-1` and `CUST-PHONE-NUM-2` persist as 15-character `(NNN)NNN-NNNN` values. Account maintenance assembles that representation before rewriting the customer (`00.phase-1-input/cbl/COACTUPC.cbl`, lines 4027-4041) and explicitly documents/edits the format (`00.phase-1-input/cbl/COACTUPC.cbl`, lines 2225-2240).
- `CUST-SSN` persists as nine digits (`PIC 9(09)`); account view renders it as `NNN-NN-NNNN` (`00.phase-1-input/cpy/CVCUS01Y.cpy`, line 17; `00.phase-1-input/cbl/COACTVWC.cbl`, lines 495-504).
- `CUST-DOB-YYYY-MM-DD` persists as `YYYY-MM-DD`; account maintenance constructs the ten-character value from separate year, month, and day inputs before rewrite (`00.phase-1-input/cpy/CVCUS01Y.cpy`, line 19; `00.phase-1-input/cbl/COACTUPC.cbl`, lines 4044-4052).

**Relationships**:
- Parent: None.
- Children: `Card Account Assignment` is 0:N by `XREF-CUST-ID`; the assignment is retrieved by account before the customer master is read (`00.phase-1-input/cbl/COACTVWC.cbl`, lines 691-710 and 727-740).
- Associates: `Account` and `Card` are associated through `Card Account Assignment`.

**Usage Context**:
- Programs: `COACTVWC` reads the customer after resolving the account assignment (`00.phase-1-input/cbl/COACTVWC.cbl`, lines 825-834); `COACTUPC` reads and rewrites it as part of account maintenance (`00.phase-1-input/cbl/COACTUPC.cbl`, lines 3917-3929 and 4004-4091); `COCRDSLC` and `COCRDUPC` include its record layout (`00.phase-1-input/cbl/COCRDSLC.cbl`, line 240; `00.phase-1-input/cbl/COCRDUPC.cbl`, line 359).
- Business Functions: View and maintain the customer data attached to a card account.

### ENTITY-002: Account

**Entity Type**: Master  
**Description**: A credit-card account holding its balance, credit limits, lifecycle dates, cycle activity totals, mailing postal code, and account group.  
**Source**: `00.phase-1-input/cpy/CVACT01Y.cpy`, lines 4-17; persisted as ACCTDAT in `00.phase-1-input/csd/CARDDEMO.CSD`, lines 1-12.

**Business Attributes**:
- Primary Key: `ACCT-ID`
- Core Attributes: current balance, credit limits, open/expiration/reissue dates, current-cycle credit and debit, address ZIP, and account group
- Foreign Keys: `ACCT-GROUP-ID` is the business group used by `Disclosure Group Rate` (`00.phase-1-input/cpy/CVTRA02Y.cpy`, lines 5-9)
- Status Fields: `ACCT-ACTIVE-STATUS`

**Data Structure**:

| Field | Data Type | Description | Key |
|---|---|---|---|
| ACCT-ID | PIC 9(11) | Account identifier | PK |
| ACCT-ACTIVE-STATUS | PIC X(01) | Account active status | — |
| ACCT-CURR-BAL | PIC S9(10)V99 | Current account balance | — |
| ACCT-CREDIT-LIMIT | PIC S9(10)V99 | Credit limit | — |
| ACCT-CASH-CREDIT-LIMIT | PIC S9(10)V99 | Cash-advance credit limit | — |
| ACCT-OPEN-DATE | PIC X(10) | Account opening date | — |
| ACCT-EXPIRAION-DATE | PIC X(10) | Account expiration date | — |
| ACCT-REISSUE-DATE | PIC X(10) | Card reissue date | — |
| ACCT-CURR-CYC-CREDIT | PIC S9(10)V99 | Current-cycle credit total | — |
| ACCT-CURR-CYC-DEBIT | PIC S9(10)V99 | Current-cycle debit total | — |
| ACCT-ADDR-ZIP | PIC X(10) | Account mailing postal code | — |
| ACCT-GROUP-ID | PIC X(10) | Account group identifier | FK |

**Relationships**:
- Parent: `Disclosure Group Rate` is an optional configuration association through `ACCT-GROUP-ID`; one account group can have 0:N rate rules, each keyed additionally by transaction type and category (`00.phase-1-input/cpy/CVTRA02Y.cpy`, lines 5-9).
- Children: `Card` is 0:N through `CARD-ACCT-ID`; `Card Account Assignment` is 0:N through `XREF-ACCT-ID`; `Transaction Category Balance` is 0:N through `TRANCAT-ACCT-ID` (`00.phase-1-input/cpy/CVACT02Y.cpy`, lines 5-6; `00.phase-1-input/cpy/CVACT03Y.cpy`, lines 5-7; `00.phase-1-input/cpy/CVTRA01Y.cpy`, lines 5-9).
- Associates: `Customer` and `Card` are resolved from an account through `Card Account Assignment` (`00.phase-1-input/cbl/COACTUPC.cbl`, lines 3614-3634 and 3650-3667).

**Usage Context**:
- Programs: `COACTVWC` reads the account by account ID (`00.phase-1-input/cbl/COACTVWC.cbl`, lines 774-784); `COACTUPC` reads and rewrites it during account maintenance (`00.phase-1-input/cbl/COACTUPC.cbl`, lines 3890-3903 and 4061-4071); `COBIL00C` reads and rewrites the balance for bill payment (`00.phase-1-input/cbl/COBIL00C.cbl`, lines 343-385).
- Business Functions: Account inquiry and maintenance; online bill payment and balance reduction.

### ENTITY-003: Card

**Entity Type**: Master  
**Description**: A physical credit card issued on an account, with security code, embossed holder name, expiration date, and active status.  
**Source**: `00.phase-1-input/cpy/CVACT02Y.cpy`, lines 4-11; persisted as CARDDAT in `00.phase-1-input/csd/CARDDEMO.CSD`, lines 25-36.

**Business Attributes**:
- Primary Key: `CARD-NUM`
- Core Attributes: CVV code, embossed name, and expiration date
- Foreign Keys: `CARD-ACCT-ID` references `Account.ACCT-ID`
- Status Fields: `CARD-ACTIVE-STATUS`

**Data Structure**:

| Field | Data Type | Description | Key |
|---|---|---|---|
| CARD-NUM | PIC X(16) | Card number | PK |
| CARD-ACCT-ID | PIC 9(11) | Associated account identifier | FK |
| CARD-CVV-CD | PIC 9(03) | Card verification value | — |
| CARD-EMBOSSED-NAME | PIC X(50) | Name embossed on the card | — |
| CARD-EXPIRAION-DATE | PIC X(10) | Card expiration date | — |
| CARD-ACTIVE-STATUS | PIC X(01) | Card active status | — |

**Relationships**:
- Parent: `Account` is 1:0..N cards through `CARD-ACCT-ID` (`00.phase-1-input/cpy/CVACT02Y.cpy`, lines 5-6).
- Children: `Card Account Assignment` is 1:1 per card because `XREF-CARD-NUM` is the cross-reference record key; `Transaction` is 1:0..N through `TRAN-CARD-NUM` (`00.phase-1-input/cpy/CVACT03Y.cpy`, lines 4-7; `00.phase-1-input/cpy/CVTRA05Y.cpy`, lines 5-16).
- Associates: `Customer` is connected to a card by `Card Account Assignment`.

**Usage Context**:
- Programs: `COCRDLIC` includes the card layout to list cards (`00.phase-1-input/cbl/COCRDLIC.cbl`, line 290); `COCRDSLC` includes it to view card detail (`00.phase-1-input/cbl/COCRDSLC.cbl`, line 234); `COCRDUPC` reads and rewrites it for card maintenance (`00.phase-1-input/cbl/COCRDUPC.cbl`, lines 1376-1390 and 1420-1483); `COACTVWC` uses the layout in account inquiry (`00.phase-1-input/cbl/COACTVWC.cbl`, line 248).
- Business Functions: List, search, view, and update issued cards; link transactions to issued cards.

### ENTITY-004: Card Account Assignment

**Entity Type**: Relationship  
**Description**: The persisted assignment that connects one card with its customer and account. It supplies both the card-keyed path and an alternate account-keyed path used by account inquiry, billing, and transaction entry.  
**Source**: `00.phase-1-input/cpy/CVACT03Y.cpy`, lines 4-8; CICS describes CCXREF as “CARD TO ACCOUNT XREF” and CXACAIX as its account-key alternate index in `00.phase-1-input/csd/CARDDEMO.CSD`, lines 37-49 and 63-75.

**Business Attributes**:
- Primary Key: `XREF-CARD-NUM`
- Core Attributes: None beyond the relationship keys
- Foreign Keys: `XREF-CUST-ID` references `Customer.CUST-ID`; `XREF-ACCT-ID` references `Account.ACCT-ID`
- Status Fields: None

**Data Structure**:

| Field | Data Type | Description | Key |
|---|---|---|---|
| XREF-CARD-NUM | PIC X(16) | Assigned card number | PK / FK |
| XREF-CUST-ID | PIC 9(09) | Associated customer identifier | FK |
| XREF-ACCT-ID | PIC 9(11) | Associated account identifier | FK |

**Relationships**:
- Parent: `Card` is 1:1; `Customer` is 1:0..N; `Account` is 1:0..N. The source defines one assignment record per card key and a separate alternate index path by account (`00.phase-1-input/cpy/CVACT03Y.cpy`, lines 5-7; `00.phase-1-input/csd/CARDDEMO.CSD`, lines 37-49 and 63-75).
- Children: None.
- Associates: Resolves the `Account`/`Card` pair in transaction entry in either direction (`00.phase-1-input/cbl/COTRN02C.cbl`, lines 195-223) and supplies a billing transaction’s card from its account (`00.phase-1-input/cbl/COBIL00C.cbl`, lines 210-225).

**Usage Context**:
- Programs: `COACTVWC` reads the account-key path and obtains the customer and card IDs (`00.phase-1-input/cbl/COACTVWC.cbl`, lines 723-740); `COACTUPC` performs the same account-to-customer/card resolution (`00.phase-1-input/cbl/COACTUPC.cbl`, lines 3650-3667); `COTRN02C` reads both key paths (`00.phase-1-input/cbl/COTRN02C.cbl`, lines 576-616); `COBIL00C` reads the account-key path (`00.phase-1-input/cbl/COBIL00C.cbl`, lines 406-418).
- Business Functions: Resolve a card, customer, and account for inquiry, maintenance, billing, and transaction entry.

### ENTITY-005: Transaction

**Entity Type**: Transactional  
**Description**: A monetary card event, including its type/category, source, amount, merchant details, card, and original and processing timestamps.  
**Source**: `00.phase-1-input/cpy/CVTRA05Y.cpy`, lines 4-18; persisted as TRANSACT in `00.phase-1-input/csd/CARDDEMO.CSD`, lines 76-87.

**Business Attributes**:
- Primary Key: `TRAN-ID`
- Core Attributes: source, description, amount, merchant identifier/name/location, original timestamp, and processing timestamp
- Foreign Keys: `TRAN-TYPE-CD` references `Transaction Type`; (`TRAN-TYPE-CD`, `TRAN-CAT-CD`) references `Transaction Category`; `TRAN-CARD-NUM` references `Card.CARD-NUM`
- Status Fields: None

**Data Structure**:

| Field | Data Type | Description | Key |
|---|---|---|---|
| TRAN-ID | PIC X(16) | Transaction identifier | PK |
| TRAN-TYPE-CD | PIC X(02) | Transaction type code | FK |
| TRAN-CAT-CD | PIC 9(04) | Transaction category code | FK |
| TRAN-SOURCE | PIC X(10) | Transaction source | — |
| TRAN-DESC | PIC X(100) | Transaction description | — |
| TRAN-AMT | PIC S9(09)V99 | Transaction amount | — |
| TRAN-MERCHANT-ID | PIC 9(09) | Merchant identifier | — |
| TRAN-MERCHANT-NAME | PIC X(50) | Merchant name | — |
| TRAN-MERCHANT-CITY | PIC X(50) | Merchant city | — |
| TRAN-MERCHANT-ZIP | PIC X(10) | Merchant postal code | — |
| TRAN-CARD-NUM | PIC X(16) | Card charged or credited | FK |
| TRAN-ORIG-TS | PIC X(26) | Original event timestamp; full timestamp representation | — |
| TRAN-PROC-TS | PIC X(26) | Processing timestamp; full timestamp representation | — |

**Timestamp Representations and Reporting**:
- The persisted fields are 26-character timestamp fields (`PIC X(26)`). The supplied daily transaction data demonstrates `TRAN-ORIG-TS` as `YYYY-MM-DD HH:MM:SS.ffffff` and can leave `TRAN-PROC-TS` blank (`00.phase-1-input/cpy/CVTRA05Y.cpy`, lines 15-17; `00.phase-1-input/data/ASCII/dailytran.txt`, line 1).
- Manual transaction entry (`COTRN02C`) presents only ten-character dates (`TORIGDTI` and `TPROCDTI`, each `PIC X(10)`), requires each, validates each as `YYYY-MM-DD`, and moves those values directly into the corresponding 26-character persisted fields (`00.phase-1-input/cpy-bms/COTRN02.CPY`, lines 97-108; `00.phase-1-input/cbl/COTRN02C.cbl`, lines 282-293, 353-381, and 450-465). These records therefore store date-only values padded within the 26-character fields.
- Online bill payment (`COBIL00C`) instead generates the current `YYYY-MM-DD HH:MM:SS.000000` value and writes the same full timestamp to both `TRAN-ORIG-TS` and `TRAN-PROC-TS` (`00.phase-1-input/cbl/COBIL00C.cbl`, lines 210-235 and 249-267).
- Reporting filters on the first ten bytes of `TRAN-PROC-TS` (offset 305 in the 350-byte record) as `TRAN-PROC-DT`, then sorts by card. Thus full timestamps, date-only/padded manual entries, and blank processing timestamps have materially different report eligibility despite sharing the same COBOL field (`00.phase-1-input/proc/TRANREPT.prc`, lines 35-46; `00.phase-1-input/cbl/CORPT00C.cbl`, lines 96-106).

**Relationships**:
- Parent: `Card` is 1:0..N transactions; `Transaction Type` is 1:0..N transactions; `Transaction Category` is 1:0..N transactions. The type/category and card keys are defined in the record (`00.phase-1-input/cpy/CVTRA05Y.cpy`, lines 5-16) and transaction entry sets them (`00.phase-1-input/cbl/COTRN02C.cbl`, lines 450-465).
- Children: None.
- Associates: An `Account` is reachable through the transaction’s card and its assignment; billing resolves the account’s card before creating the payment transaction (`00.phase-1-input/cbl/COBIL00C.cbl`, lines 210-235).

**Usage Context**:
- Programs: `COTRN00C` browses transaction records for the list view (`00.phase-1-input/cbl/COTRN00C.cbl`, lines 281-322 and 591-634); `COTRN01C` reads an individual transaction (`00.phase-1-input/cbl/COTRN01C.cbl`, lines 172-191 and 265-278); `COTRN02C` creates transactions (`00.phase-1-input/cbl/COTRN02C.cbl`, lines 442-466 and 709-721); `COBIL00C` creates bill-payment transactions (`00.phase-1-input/cbl/COBIL00C.cbl`, lines 210-235 and 508-520); `CORPT00C` includes the transaction record for reporting (`00.phase-1-input/cbl/CORPT00C.cbl`, line 146).
- Business Functions: List and view transactions, add a card transaction, record online bill payments, and produce date-range transaction reports.

### ENTITY-006: Transaction Type

**Entity Type**: Configuration  
**Description**: Reference data that defines a two-character transaction type and its business description.  
**Source**: `00.phase-1-input/cpy/CVTRA03Y.cpy`, lines 4-7; supplied values in `00.phase-1-input/data/ASCII/trantype.txt`, lines 1-5; TRANTYPE VSAM cluster in `00.phase-1-input/catlg/LISTCAT.txt`, lines 3742-3767.

**Business Attributes**:
- Primary Key: `TRAN-TYPE`
- Core Attributes: `TRAN-TYPE-DESC`
- Foreign Keys: None
- Status Fields: None

**Data Structure**:

| Field | Data Type | Description | Key |
|---|---|---|---|
| TRAN-TYPE | PIC X(02) | Transaction type code | PK |
| TRAN-TYPE-DESC | PIC X(50) | Transaction type description | — |

**Relationships**:
- Parent: None.
- Children: `Transaction Category` is 1:0..N by `TRAN-TYPE-CD`; `Transaction`, `Transaction Category Balance`, and `Disclosure Group Rate` each use the type code (`00.phase-1-input/cpy/CVTRA04Y.cpy`, lines 5-8; `00.phase-1-input/cpy/CVTRA05Y.cpy`, lines 5-7; `00.phase-1-input/cpy/CVTRA01Y.cpy`, lines 5-9; `00.phase-1-input/cpy/CVTRA02Y.cpy`, lines 5-9).
- Associates: Defines the first component of the category configuration key.

**Usage Context**:
- Programs: The supplied reporting procedure allocates the TRANTYPE dataset for transaction reporting (`00.phase-1-input/proc/TRANREPT.prc`, lines 55-78).
- Business Functions: Classify transactions and provide type descriptions for reports.

### ENTITY-007: Transaction Category

**Entity Type**: Configuration  
**Description**: A transaction classification within a transaction type, with a description used to distinguish financial event categories.  
**Source**: `00.phase-1-input/cpy/CVTRA04Y.cpy`, lines 4-9; supplied values in `00.phase-1-input/data/ASCII/trancatg.txt`, lines 1-5; TRANCATG VSAM cluster in `00.phase-1-input/catlg/LISTCAT.txt`, lines 1440-1465.

**Business Attributes**:
- Primary Key: Composite `TRAN-TYPE-CD`, `TRAN-CAT-CD`
- Core Attributes: `TRAN-CAT-TYPE-DESC`
- Foreign Keys: `TRAN-TYPE-CD` references `Transaction Type.TRAN-TYPE`
- Status Fields: None

**Data Structure**:

| Field | Data Type | Description | Key |
|---|---|---|---|
| TRAN-TYPE-CD | PIC X(02) | Parent transaction type code | PK / FK |
| TRAN-CAT-CD | PIC 9(04) | Transaction category code | PK |
| TRAN-CAT-TYPE-DESC | PIC X(50) | Transaction category description | — |

**Relationships**:
- Parent: `Transaction Type` is 1:0..N categories (`00.phase-1-input/cpy/CVTRA04Y.cpy`, lines 5-8).
- Children: `Transaction Category Balance` is 1:0..N per account; `Disclosure Group Rate` is 1:0..N per account group. `Transaction` records carry the same type/category pair (`00.phase-1-input/cpy/CVTRA01Y.cpy`, lines 5-9; `00.phase-1-input/cpy/CVTRA02Y.cpy`, lines 5-9; `00.phase-1-input/cpy/CVTRA05Y.cpy`, lines 5-7).
- Associates: Classifies a `Transaction` together with `Transaction Type`.

**Usage Context**:
- Programs: The transaction-entry program accepts and stores the type/category values (`00.phase-1-input/cbl/COTRN02C.cbl`, lines 450-465); the reporting procedure allocates the TRANCATG dataset (`00.phase-1-input/proc/TRANREPT.prc`, lines 65-70).
- Business Functions: Categorize card events and provide category descriptions for transaction reporting.

### ENTITY-008: Transaction Category Balance

**Entity Type**: Relationship  
**Description**: The balance accumulated for a specific account and transaction type/category combination.  
**Source**: `00.phase-1-input/cpy/CVTRA01Y.cpy`, lines 4-10; supplied records in `00.phase-1-input/data/ASCII/tcatbal.txt`, lines 1-5; TCATBALF VSAM cluster in `00.phase-1-input/catlg/LISTCAT.txt`, lines 1334-1360.

**Business Attributes**:
- Primary Key: Composite `TRANCAT-ACCT-ID`, `TRANCAT-TYPE-CD`, `TRANCAT-CD`
- Core Attributes: `TRAN-CAT-BAL`
- Foreign Keys: `TRANCAT-ACCT-ID` references `Account.ACCT-ID`; (`TRANCAT-TYPE-CD`, `TRANCAT-CD`) references `Transaction Category`
- Status Fields: None

**Data Structure**:

| Field | Data Type | Description | Key |
|---|---|---|---|
| TRANCAT-ACCT-ID | PIC 9(11) | Account identifier | PK / FK |
| TRANCAT-TYPE-CD | PIC X(02) | Transaction type code | PK / FK |
| TRANCAT-CD | PIC 9(04) | Transaction category code | PK / FK |
| TRAN-CAT-BAL | PIC S9(09)V99 | Accumulated balance for the key combination | — |

**Relationships**:
- Parent: `Account` is 1:0..N category balances and `Transaction Category` is 1:0..N account balances; the composite business key contains both parent keys (`00.phase-1-input/cpy/CVTRA01Y.cpy`, lines 5-9).
- Children: None.
- Associates: Represents account exposure aggregated by transaction type and category.

**Usage Context**:
- Programs: No supplied COBOL program references this record layout; the entity is nevertheless persisted as the TCATBALF VSAM business balance file and supplied as initial data (`00.phase-1-input/catlg/LISTCAT.txt`, lines 1304-1360; `00.phase-1-input/data/ASCII/tcatbal.txt`, lines 1-5).
- Business Functions: Maintain per-account balances by transaction classification.

### ENTITY-009: Disclosure Group Rate

**Entity Type**: Configuration  
**Description**: A rate rule for an account group and transaction type/category combination.  
**Source**: `00.phase-1-input/cpy/CVTRA02Y.cpy`, lines 4-10; supplied values in `00.phase-1-input/data/ASCII/discgrp.txt`, lines 1-5; DISCGRP VSAM cluster in `00.phase-1-input/catlg/LISTCAT.txt`, lines 859-885.

**Business Attributes**:
- Primary Key: Composite `DIS-ACCT-GROUP-ID`, `DIS-TRAN-TYPE-CD`, `DIS-TRAN-CAT-CD`
- Core Attributes: `DIS-INT-RATE`
- Foreign Keys: `DIS-ACCT-GROUP-ID` matches `Account.ACCT-GROUP-ID`; (`DIS-TRAN-TYPE-CD`, `DIS-TRAN-CAT-CD`) references `Transaction Category`
- Status Fields: None

**Data Structure**:

| Field | Data Type | Description | Key |
|---|---|---|---|
| DIS-ACCT-GROUP-ID | PIC X(10) | Account group identifier | PK / FK |
| DIS-TRAN-TYPE-CD | PIC X(02) | Transaction type code | PK / FK |
| DIS-TRAN-CAT-CD | PIC 9(04) | Transaction category code | PK / FK |
| DIS-INT-RATE | PIC S9(04)V99 | Interest rate for the group/category combination | — |

**Relationships**:
- Parent: An `Account` group is 1:0..N rate rules and a `Transaction Category` is 1:0..N rate rules; all three keys are stored in the rate-rule composite key (`00.phase-1-input/cpy/CVTRA02Y.cpy`, lines 5-9; `00.phase-1-input/cpy/CVACT01Y.cpy`, lines 15-16).
- Children: None.
- Associates: Supplies interest-rate configuration for an account’s group and transaction category.

**Usage Context**:
- Programs: No supplied COBOL program references this record layout; the entity is persisted as DISCGRP and supplied as initial configuration data (`00.phase-1-input/catlg/LISTCAT.txt`, lines 844-885; `00.phase-1-input/data/ASCII/discgrp.txt`, lines 1-5).
- Business Functions: Configure interest rates by account group and transaction classification.

### ENTITY-010: Application User

**Entity Type**: Master  
**Description**: An internal application user with name, sign-in credential, and user type used to authorize administrative versus standard application access.  
**Source**: `00.phase-1-input/cpy/CSUSR01Y.cpy`, lines 17-23; persisted as USRSEC in `00.phase-1-input/csd/CARDDEMO.CSD`, lines 88-99.

**Business Attributes**:
- Primary Key: `SEC-USR-ID`
- Core Attributes: first name, last name, and password credential
- Foreign Keys: None
- Status Fields: `SEC-USR-TYPE` determines application access type

**Data Structure**:

| Field | Data Type | Description | Key |
|---|---|---|---|
| SEC-USR-ID | PIC X(08) | Application user identifier | PK |
| SEC-USR-FNAME | PIC X(20) | First name | — |
| SEC-USR-LNAME | PIC X(20) | Last name | — |
| SEC-USR-PWD | PIC X(08) | Sign-in password credential | — |
| SEC-USR-TYPE | PIC X(01) | User access type | — |

**Relationships**:
- Parent: None.
- Children: None.
- Associates: The user type selects the administrative or standard application route after successful credential verification (`00.phase-1-input/cbl/COSGN00C.cbl`, lines 211-239).

**Usage Context**:
- Programs: `COSGN00C` reads the record and verifies the password/user type for sign-in (`00.phase-1-input/cbl/COSGN00C.cbl`, lines 207-239); `COUSR00C` lists users (`00.phase-1-input/cbl/COUSR00C.cbl`, lines 584-655); `COUSR01C` creates users (`00.phase-1-input/cbl/COUSR01C.cbl`, lines 236-266); `COUSR02C` reads and rewrites users (`00.phase-1-input/cbl/COUSR02C.cbl`, lines 318-366); `COUSR03C` reads and deletes users (`00.phase-1-input/cbl/COUSR03C.cbl`, lines 265-311).
- Business Functions: Authenticate users, route access by role, and administer user records.
