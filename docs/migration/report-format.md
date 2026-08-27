# Async report format

`TRANREPT.prc` calls the unavailable `CBTRN03C`; this is a deterministic target layout, not a claim of executable legacy formatter byte parity. Each record is printable single-byte ASCII and exactly 133 bytes, with LF separators only and no trailing LF.

Every logical page starts with a report/date header and two column headers. A page contains at most 55 details. An account total follows an account-run break, then a page total at page/end boundaries; the account total precedes the page total when both occur. A grand total ends every artifact, including the empty report. Details are ordered by card number then transaction ID. The selected timestamp mode is stored on the job: fallback uses `COALESCE(processed_ts, original_ts)` and strict mode excludes null processed timestamps.

Detail fields occupy: transaction ID 1–16, account 18–28, type 30–31, type description 33–47, category 49–52, category description 54–82, source 84–93, and signed 15-byte amount 98–112. Headers have source widths 115/114/133 and totals 112 before right padding. Amounts outside `999,999,999.99` render as 15 asterisks and produce warning metadata without changing record width.
