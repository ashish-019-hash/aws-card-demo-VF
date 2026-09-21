# Architecture & Technology Summary

**Source:** synthesized from [`codebase-wiki.md`](../codebase-wiki.md) (the orientation
document produced before deep extraction) and cross-checked against details recorded in
[`business-entities.md`](../business-entities.md) and [`screen-flow.md`](../screen-flow.md).
This page intentionally stays brief — full technical detail lives in `codebase-wiki.md`;
this page summarizes it and points a reader who only wants the "shape" of the system in
the right direction.

## Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Language | COBOL (fixed-form) | 18 programs under the legacy `cbl/` tree |
| Online transaction processing | CICS (pseudo-conversational) | Every online program follows receive → process → send-and-return |
| UI / screens | BMS (Basic Mapping Support) | 17 BMS maps, one per screen |
| Data access | VSAM KSDS (Keyed Sequential Data Set) | 12+ files, some with alternate indexes (AIX) |
| Batch reporting | JCL (Job Control Language) + SORT + COBOL | One documented batch chain: `TRANREPT` |
| Inter-program session state | COMMAREA (`COCOM01Y` copybook) | Carries user identity, routing, and entity context between programs |

## Pseudo-Conversational Pattern

Each CICS program in CardDemo follows the same lifecycle:

1. **Receive** — read the user's input from the last screen (`CICS RECEIVE MAP`).
2. **Process** — validate input, read/update VSAM files, decide the next state.
3. **Send & suspend** — send the response screen (`CICS SEND MAP`) and suspend with
   `CICS RETURN TRANSID`, to be reactivated on the next key press.

The **COMMAREA** (`COCOM01Y`, ~174 bytes) is the only state carried between these
suspend/resume cycles — it holds the signed-on user's ID and type, routing information
(from/to transaction and program), and whatever account/card/customer context the current
workflow needs. Programs move explicitly between screens with **XCTL** (transfer control,
no return) or resume themselves with **RETURN TRANSID**.

## Program, Screen, and Data Scale

- **17 end-user screens** across 16 online programs (see
  [Component Inventory](./component-inventory.md) for the full list) — plus one
  developer-only screen (`COCRDSEC` / transaction `CDV1`) that is defined in the CICS
  resource table but not reachable from any menu, and is excluded from the end-user
  documentation in this wiki.
- **1 shared date-utility subroutine** (`CSUTLDTC`, called via `CICS LINK`/COBOL `CALL`,
  not a screen) used for calendar-date validation across several screens.
- **11 business entities** (master, transactional, junction, and reference/configuration)
  — see [Data Model](./data-model.md).
- **1 documented batch job chain** (`TRANREPT`) triggered indirectly by the Transaction
  Reporting screen — see [Transaction Reporting](./modules/reporting.md).

## Batch Component

The only batch processing path Phase 1 could confirm end-to-end is the **transaction
report** flow: the online screen (`CORPT00C`) writes a job-submission request to a CICS
transient-data queue (`JOBS`), which a background job reader picks up to run the
`TRANREPT` JCL procedure (unload → sort/filter → format). The batch program that formats
the report itself, `CBTRN03C`, is referenced by the JCL but was not found in the source
tree available to Phase 1 — flagged as a gap in `codebase-wiki.md` and repeated in
[Modernization Notes](./modernization-notes.md#carried-forward-gaps).

No other batch/background processing (e.g. interest calculation, statement generation,
data load/purge jobs) was found documented in the Phase 1 artifacts — several reference
tables (`TRANTYPE`, `TRANCATG`, `TCATBALF`, `DISCGRP`) exist in the data model with no
online maintenance program and no confirmed batch maintainer either (see
[Data Model](./data-model.md) and [Modernization Notes](./modernization-notes.md)).

## What Phase 1 Did Not Capture

`codebase-wiki.md` is an orientation-level document, not a full architecture spec. It does
not include: non-functional characteristics (performance, availability targets), deployment
topology, security/compliance posture beyond what's inferable from the screens (e.g. plain-
text stored passwords, no per-user record-ownership scoping — see
[Business Rules & Validation Summary](./business-rules-and-validation.md)), or an
inventory of the JCL/CSD resources beyond what's needed to explain program routing. Where a
later page in this wiki would normally cover one of these, it says so explicitly rather than
filling the gap with inference beyond what's in the source documents.
