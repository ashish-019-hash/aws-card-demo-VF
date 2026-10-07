# Module: Reporting

[← Overview](../README.md) | [Architecture](../architecture.md) | [Key Workflows](../key-workflows.md)

## Purpose

Online request screen that **submits a batch job** to produce a transaction report for a date range. This is the only online→batch bridge in the application.

| Artifact | Path |
|---|---|
| Online program | `00.phase-1-input/cbl/CORPT00C.cbl` (649 lines), transaction **CR00**, mapset CORPT00 / map CORPT0A (`00.phase-1-input/bms/CORPT00.bms`) |
| Batch procedure | `00.phase-1-input/proc/TRANREPT.prc` |
| Backup procedure | `00.phase-1-input/proc/REPROC.prc` + control card `00.phase-1-input/ctl/REPROCT.ctl` |
| Report record layouts | `00.phase-1-input/cpy/CVTRA07Y.cpy` |
| CICS TDQ | `JOBS` → DDNAME `INREADER` (internal reader), `00.phase-1-input/csd/CARDDEMO.CSD:499-505` |

## Online side (CORPT00C)

1. The user picks **Monthly**, **Yearly**, or **Custom** date range (`EVALUATE` on `MONTHLYI`/`YEARLYI`/`CUSTOMI` of `CORPT0AI`, `cbl/CORPT00C.cbl:213-256`).
2. Custom dates are validated via `CALL 'CSUTLDTC'` for start and end date (`cbl/CORPT00C.cbl:392, 411-414` and `:408+`).
3. A complete JCL job is held in working storage as 80-byte card images: `JOB-DATA` (`cbl/CORPT00C.cbl:81-126`), job name `TRNRPT00`, `//STEP10 EXEC PROC=TRANREPT` (`:94`), plus SORT `SYMNAMES` and a `DATEPARM` with the chosen start/end dates.
4. `SUBMIT-JOB-TO-INTRDR` (`:462-`) writes the JCL line-by-line to TDQ `JOBS` (`WIRTE-JOBSUB-TDQ` — typo in source — `:515-521`, `EXEC CICS WRITEQ TD QUEUE('JOBS')`), which CICS routes to the JES internal reader per the CSD TDQUEUE definition.

## Batch side (TRANREPT.prc)

`00.phase-1-input/proc/TRANREPT.prc` steps:

1. **STEP01R** — back up `TRANSACT` VSAM to a flat file via `PROC=REPROC` (IDCAMS REPRO) (`proc/TRANREPT.prc:21-30`).
2. **Sort step** — `SORT FIELDS=(TRAN-CARD-NUM,A)` with `INCLUDE COND=(TRAN-PROC-DT,GE,PARM-START-DATE,AND,TRAN-PROC-DT,LE,PARM-END-DATE)` (`proc/TRANREPT.prc:42-48`).
3. **STEP10R** — `EXEC PGM=CBTRN03C` (`proc/TRANREPT.prc:57`) reading the sorted transactions plus `CARDXREF`, `TRANTYPE`, `TRANCATG` reference files and writing report GDG `TRANREPT(+1)` (`proc/TRANREPT.prc:57-78`).

**Gap:** `CBTRN03C` has no source in this repository — the report formatting logic is not inspectable; only its inputs/outputs (from the JCL) and the report line layouts (`cpy/CVTRA07Y.cpy`) are known.
