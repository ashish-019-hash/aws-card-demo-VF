# Module: Transaction Reports

[← Overview](../README.md) | Prev: [Bill Payment](bill-payment.md) | Next: [User Security Administration](user-administration.md)

## What it does

The only online→batch bridge in the application. A user requests a printed transaction report
for the current month, current year, or a custom date range; after confirmation the online
program writes a prepared JCL job to the CICS TDQ `JOBS` (JES internal reader). The batch
procedure backs up the transaction file, filters transactions **by processing date** within
the period, sorts them by card number, and formats the printed report.
(Sources: [business-rules-catalog.md](../../business-rules-catalog.md) Reporting;
[screen-flow.md](../../screen-flow.md) SCREEN-12; [user-stories.md](../../user-stories.md) STORY-018/019.)

## Cross-reference

| Function | Screen / Component | Entities | Business Rules | Validation Rules | Stories |
|---|---|---|---|---|---|
| Request a report (Monthly / Yearly / Custom) | CORPT00 (CR00 / CORPT00C) | [Transaction (005)](../data-model.md#entity-catalog) (report subject) | [RULE-CALC-002](../../business-rules-catalog.md) (period determination) | [RULE-VAL-069–073](../../validation-rules.md) | STORY-018 |
| Produce the printed report (batch) | TRANREPT.prc → CBTRN03C (source **not in tree**) | Transaction (005), Card-XREF (004), Tran Type (009), Tran Category (010) | [RULE-DECISION-004](../../business-rules-catalog.md) (selection + ordering) | — | STORY-019 |

## Business rules

| Rule | Summary |
|---|---|
| [RULE-CALC-002](../../business-rules-catalog.md) | Monthly = 1st through last day of the current calendar month (correct for 28/29/30/31-day months); Yearly = Jan 1 – Dec 31 of the current year; Custom = user-entered dates. Calendar periods, **not** rolling windows. |
| [RULE-DECISION-004](../../business-rules-catalog.md) | Report includes exactly the transactions whose **processing** date (not origination date) falls in the period, inclusive, ordered ascending by card number. |

## Screen & navigation ([screen-flow.md SCREEN-12](../../screen-flow.md))

Mark Monthly / Yearly / Custom (custom adds six date parts, MM/DD/YYYY) → Enter validates →
"Please confirm to print the … report..." → `Y` queues the batch job and shows a green
success message; `N` cancels and resets. F3 → Main Menu.

## Validations (full list: [validation-rules.md §12](../../validation-rules.md))

| Rule | Check |
|---|---|
| VAL-069 | A report type must be selected |
| VAL-070 | Custom: all six date components required |
| VAL-071 | Custom: components numeric and in range (month ≤ 12, day ≤ 31) |
| VAL-072 | Custom: assembled dates must be real calendar dates (via CSUTLDTC) |
| VAL-073 | Submission must be confirmed Y/N |

## Batch side (STORY-019, [TRANREPT.prc](../../user-stories.md))

1. REPRO backup of the `TRANSACT` VSAM file to a generation dataset.
2. SORT by card number with `INCLUDE` on processing date between the submitted start/end dates.
3. `PGM=CBTRN03C` reads the filtered file plus card-xref, transaction-type, and
   transaction-category reference files and writes a 133-byte print dataset.

**Gap**: `CBTRN03C`'s source is not in the repository — the report layout must be
reconstructed or re-specified during migration
([user-stories.md](../../user-stories.md) STORY-019; [Modernization Notes](../modernization-notes.md)).
