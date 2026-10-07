# Architecture & Technology Summary

[← Overview](README.md) | [Component Inventory](component-inventory.md) | [Data Model](data-model.md)

Condensed from the [orientation wiki's Architecture page](../wiki/architecture.md) (which owns
the full CICS resource map and program dependency graph) and the extraction artifacts.

## Technology stack

| Layer | Technology |
|---|---|
| Online transaction processing | IBM CICS, pseudo-conversational, 3270 terminals |
| Language | COBOL (CICS command-level) — 18 programs (17 online + 1 date utility) |
| Screens | 17 BMS mapsets (one per online program) |
| Data storage | VSAM KSDS files with alternate indexes — no database (no SQL/DB2), no MQ, no web layer |
| Batch | JCL procedures (`TRANREPT.prc`, `REPROC.prc`) + SORT/IDCAMS; batch COBOL programs are **not** in the repository |
| Date services | LE `CEEDAYS` via the called subprogram `CSUTLDTC` |

Source: [orientation wiki — Architecture](../wiki/architecture.md).

## Runtime model

- Every online program is pseudo-conversational: it sends its map, returns to CICS with its
  own transaction ID, and is restarted when the user presses an AID key.
- All programs share one COMMAREA (`CARDDEMO-COMMAREA`) carrying the signed-on user ID and
  type, from/to program, and selected customer/account/card context. This is how screens
  "remember who called them" (F3 returns to the caller) and how row selections pass keys
  forward without retyping.
  (Sources: [orientation wiki — Runtime model](../wiki/architecture.md#runtime-model);
  [screen-flow.md](../screen-flow.md) "How screens connect".)
- **Safety net**: any screen reached without a signed-on session routes straight back to the
  Sign-on screen ([screen-flow.md](../screen-flow.md) "Safety net").

## Online vs. batch split

| Portion | What Phase 1 found |
|---|---|
| Online (in repository) | All 17 screens/programs, the shared date utility `CSUTLDTC`, CICS resource definitions, VSAM catalog listing, seed data |
| Batch (mostly absent) | Only the JCL procedures exist. The report program `CBTRN03C` and the daily posting suite (`CBTRN*`) are referenced by the JCL/catalog but their source is **not** in the tree. The online screen CORPT00 bridges to batch by writing JCL to the CICS TDQ `JOBS` (JES internal reader). |

Sources: [business-rules-catalog.md](../business-rules-catalog.md) scope note;
[business-entities.md](../business-entities.md) ENTITY-006/007/008 usage notes;
[orientation wiki — Batch layer](../wiki/architecture.md#batch-layer-partially-present).

## Security model

- Sign-on validates an 8-char user ID/password against the `USRSEC` VSAM file; the password
  comparison is **plaintext** (orientation wiki, known gap).
- Authorization is a single role flag (`A`/`U`) carried in the session; menu options are
  data-driven with a per-option required-role flag
  ([RULE-DECISION-002/003](../business-rules-catalog.md)).
- CICS transaction definitions carry no resource-level security (`RESSEC(NO) CMDSEC(NO)`).

Sources: [orientation wiki — Security model](../wiki/architecture.md#security-model);
[business-rules-catalog.md](../business-rules-catalog.md) Access and Entitlements.

## Caveats

Detailed architecture information beyond the above (e.g. batch scheduling, the report
program's internals, interest/fee calculation) was **not available** from the Phase 1
outputs because the corresponding batch source is absent from the repository — see
[Modernization Notes](modernization-notes.md).
