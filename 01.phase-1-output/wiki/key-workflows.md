# Key Workflows

[← Overview](README.md) | [Architecture](architecture.md) | [Data Overview](data-overview.md)

End-to-end flows as implemented in source. Per-screen field detail is owned by `01.phase-1-output/screen-flow.md`; business logic by `01.phase-1-output/business-rules-catalog.md`.

## 1. Sign-on and menu routing

```
3270 terminal ── tran CC00 ──> COSGN00C (sign-on screen COSGN0A)
    READ USRSEC by user id ── plaintext password compare (COSGN00C.cbl:209-227)
    ├─ SEC-USR-TYPE = 'A' ──XCTL──> COADM01C (admin menu, CA00)
    └─ otherwise          ──XCTL──> COMEN01C (main menu, CM00)
Menu option n ──> XCTL PROGRAM(CDEMO-MENU-OPT-PGMNAME(n))   (COMEN01C.cbl:152-154)
PF3 anywhere ──> XCTL PROGRAM(CDEMO-TO-PROGRAM) back to caller
```

Sources: `00.phase-1-input/cbl/COSGN00C.cbl:209-240`, `00.phase-1-input/cbl/COMEN01C.cbl:126-155`, option tables `00.phase-1-input/cpy/COMEN02Y.cpy` / `COADM02Y.cpy`. See [Authentication](modules/authentication.md), [Menus & Navigation](modules/menu-navigation.md).

## 2. Account view / update

```
Account id ──READ CXACAIX (xref by acct)──> card xref ──READ ACCTDAT──> account
                                                      └─READ CUSTDAT──> customer
Update (COACTUPC): edit all fields ──> compare old vs new (1205-COMPARE-OLD-NEW)
  ──confirm──> READ UPDATE both files ──> re-check record unchanged (9700-CHECK-CHANGE-IN-REC)
  ──> REWRITE ACCTDAT (:4066) and CUSTDAT (:4086)
```

Sources: `00.phase-1-input/cbl/COACTVWC.cbl:687-736`, `00.phase-1-input/cbl/COACTUPC.cbl:1429-2558, 3888-4105`. See [Account Management](modules/account-management.md).

## 3. Card list → view/update

```
COCRDLIC: STARTBR/READNEXT CARDDAT, 7 rows/page, filters from COMMAREA or screen
   row action 'S' ──XCTL──> COCRDSLC (view)
   row action 'U' ──XCTL──> COCRDUPC (update: edits ──confirm──> READ UPDATE ──> REWRITE CARDDAT)
```

Sources: `00.phase-1-input/cbl/COCRDLIC.cbl:538, 566, 1129-1294`, `00.phase-1-input/cbl/COCRDUPC.cbl:1376-1478`. See [Card Management](modules/card-management.md).

## 4. Add a transaction (COTRN02C)

```
Enter acct id or card number
  ├─ acct id ──READ CXACAIX──> resolve card/customer
  └─ card no ──READ CCXREF──> resolve acct/customer
Validate fields (dates via CALL 'CSUTLDTC' ──> CEEDAYS)
STARTBR TRANSACT from HIGH-VALUES ──READPREV──> last TRAN-ID ──> +1 (:449)
Confirm 'Y' ──> WRITE TRANSACT (:466)
```

Sources: `00.phase-1-input/cbl/COTRN02C.cbl:208-222, 393, 413, 449, 466, 642-713`. See [Transaction Management](modules/transaction-management.md).

## 5. Pay the bill in full (COBIL00C)

```
Enter acct id ──READ ACCTDAT──> show ACCT-CURR-BAL ──confirm 'Y'──>
  READ CXACAIX (card for acct) ──> STARTBR/READPREV TRANSACT ──> next TRAN-ID
  ──> WRITE 'BILL PAYMENT - ONLINE' transaction for the full balance
  ──> zero ACCT-CURR-BAL ──> REWRITE ACCTDAT (:379)
```

Source: `00.phase-1-input/cbl/COBIL00C.cbl:177-245, 343-512`. See [Bill Payment](modules/bill-payment.md).

## 6. Request a transaction report (online → batch)

```
CORPT00C (CR00): choose Monthly / Yearly / Custom date range
  custom dates validated via CSUTLDTC (:392, 411-414)
  build JCL job TRNRPT00 in working storage (:81-126)
  ──WRITEQ TD QUEUE('JOBS') (:517-521)──> CICS TDQ ──> JES internal reader (CSD:499-505)
Batch TRANREPT.prc: REPRO TRANSACT backup ──> SORT by card within date range
  ──> PGM=CBTRN03C (+ CARDXREF, TRANTYPE, TRANCATG) ──> GDG TRANREPT(+1)
```

Sources: `00.phase-1-input/cbl/CORPT00C.cbl`, `00.phase-1-input/proc/TRANREPT.prc:21-78`, `00.phase-1-input/csd/CARDDEMO.CSD:499-505`. **`CBTRN03C` source is not in the tree.** See [Reporting](modules/reporting.md).

## 7. Administer users (admin only)

```
COADM01C ──> COUSR00C (list, STARTBR/READNEXT/READPREV USRSEC)
   row select ──XCTL──> COUSR02C (update, REWRITE) / COUSR03C (delete, DELETE)
COUSR01C (add) ──> EXEC CICS WRITE USRSEC
```

Sources: `00.phase-1-input/cbl/COUSR00C.cbl:192-207, 284-343`, `COUSR01C.cbl:238-240`, `COUSR02C.cbl:358-360`, `COUSR03C.cbl:305-307`. See [User Administration](modules/user-administration.md).
