# Approved ASCII mirror divergences

## Authority and comparison policy

The raw EBCDIC CP037 files in `00.phase-1-input/data/EBCDIC/` are the canonical migration source. ASCII files are an incomplete convenience mirror only; they must never be used to establish complete database equivalence or fabricate missing data.

Mirror comparison is field-oriented after decoding EBCDIC CP037 and normalizing the documented `cardxref` filler. Any decoded field difference not in this table is a test failure until it is reviewed and added here with its key, field, canonical value, mirror value, and rationale. EBCDIC wins every conflict.

| Dataset / key                                                                         | Field             | EBCDIC canonical value           | ASCII mirror value              | Rationale                                                                                                                                                                 |
| ------------------------------------------------------------------------------------- | ----------------- | -------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CARDXREF`, every record                                                              | trailing `FILLER` | 14 bytes                         | omitted                         | `ASCII/cardxref.txt` has a 36-byte body (`card 16 + customer 9 + account 11`) instead of the 50-byte legacy record. Comparators append 14 spaces before field comparison. |
| `ACCTDATA`, `ACCT-ID=00000000049`                                                     | `ACCT-ADDR-ZIP`   | `ZEROAPR   `                     | `A000000000`                    | Source export disagreement. `ACCT-GROUP-ID` is ten spaces in canonical EBCDIC; neither value may be moved between the two fields.                                         |
| `DISCGRP`, `DIS-ACCT-GROUP-ID=DEFAULT`, `DIS-TRAN-TYPE-CD=07`, `DIS-TRAN-CAT-CD=0001` | `DIS-INT-RATE`    | `15.00` (`00150{` zoned display) | `0.00` (`00000{` zoned display) | Source export disagreement.                                                                                                                                               |

## Missing ASCII dataset

There is **no ASCII user file**. `EBCDIC/AWS.M2.CARDDEMO.USRSEC.PS` is canonical and contains 10 80-byte user records. ASCII-mode import or verification must report users as missing/partial; it must not invent credentials or claim a complete runnable migration.

## Duplicate account exports

`EBCDIC/AWS.M2.CARDDEMO.ACCDATA.PS` and `EBCDIC/AWS.M2.CARDDEMO.ACCTDATA.PS` are byte-identical account exports:

```text
SHA-256 23167cdff65ca6dfa2e5bccee89112e3e83a80247a38e251f3981377ab098ec9
```

Canonical import deduplicates them by hash rather than importing accounts twice.

## Review workflow

1. Decode CP037 before comparing fields; do not compare text-transcoded files byte-for-byte.
2. Normalize only the 14 known missing `CARDXREF` filler bytes.
3. Fail for every unlisted field difference.
4. For a newly confirmed source difference, update this document and the mirror test in the same reviewed change with the exact key, field, both values, and explanation.
5. Preserve the EBCDIC value in the canonical import regardless of mirror behavior.
