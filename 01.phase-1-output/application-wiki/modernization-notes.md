# Modernization Notes

[← Overview](README.md) | [Architecture](architecture.md) | [Data Model](data-model.md)

Honest consolidation of the gaps, risks, and must-preserve behaviors flagged across the Phase 1
artifacts and the [orientation wiki](../wiki/README.md). Nothing here is new analysis; each
item cites its source.

## Security

| Item | Detail | Source |
|---|---|---|
| Plaintext passwords | Passwords are stored and compared in plaintext in `USRSEC`; a migrated system must hash credentials and migrate existing ones | validation-rules.md VAL-004 note; orientation wiki |
| CICS security disabled | RESSEC(NO) / CMDSEC(NO) — all protection is application-level (role flag in COMMAREA) | [Architecture — security model](architecture.md#security-model) |
| Role flags are data, not code | Admin-only enforcement reads a per-option flag; migration must keep per-function authorization | [RULE-DECISION-003](../business-rules-catalog.md) |

## Missing source (cannot be migrated by translation)

| Item | Detail | Source |
|---|---|---|
| CBTRN03C report program | Executed by TRANREPT.prc but source absent — the printed report layout must be reconstructed from the print dataset spec or re-specified | user-stories.md STORY-019; [Reporting](modules/reporting.md) |
| CBTRN* batch posting suite | Daily-transaction posting, category-balance maintenance, and interest calculation exist only as datasets/load-module evidence (ENTITY-006/007/008 are batch-only); the posting logic is not in the repository | business-entities.md; [Component Inventory](component-inventory.md#batch-components) |
| COCRDSEC (tran CDV1) | Defined in the CSD, no source file | orientation wiki known gaps |

## Data model cleanups

| Item | Detail | Source |
|---|---|---|
| Customer↔Account via junction only | The CARD-XREF file is the only link; online code takes the **first** xref row per account. A relational redesign should add an explicit relationship and decide multi-cardholder semantics | business-entities.md ENTITY-004; [Data Model](data-model.md#relationships) |
| Duplicate customer layouts | CUSTREC.cpy vs CVCUS01Y.cpy differ only in the DOB field name — choose one canonical schema | business-entities.md |
| `CARD-EXPIRAION-DATE` typo | Production copybook field name; map to a correctly spelled column during migration | business-entities.md |
| No TRANSACT seed; EBCDIC-only USRSEC seed | Test data must be fabricated / converted (10 users incl. ADMIN001/PASSWORD/A) | orientation wiki data-overview |

## Behavior that must be preserved

| Behavior | Why | Source |
|---|---|---|
| Bill payment = full balance, fixed classification codes (type `02`, cat `2`, `POS TERM`, merchant `999999999`/`BILL PAYMENT`) | Downstream reporting recognizes payments by these codes | RULE-CALC-001 |
| Positive-balance gate + Y/N confirmation on payments | Prevents null/accidental payments | RULE-THRESHOLD-001, RULE-DECISION-001 |
| Calendar (not rolling) report periods; selection by **processing** date; card-number ordering | Business definition of the report | RULE-CALC-002, RULE-DECISION-004 |
| Optimistic-locking change detection on account/card/user updates | Multi-user data safety pattern | VAL-033/034, VAL-049, VAL-081 |
| Field-validation corpus (81 rules) incl. SSN, FICO 300–850, NANP phone, state+ZIP combos | These are the data-quality contract; migrate into frontend + backend layers | [validation-rules.md](../validation-rules.md) |

## Known ambiguities to resolve with business owners

| Item | Detail | Source |
|---|---|---|
| Main-menu option 8 | Comment says "Transaction Add (Admin Only)" but the flag is `U` (open to all) — the data wins at runtime; confirm intent | business-rules-catalog.md RULE-DECISION-003 notes; orientation wiki |
| Card-list "admin filtering" header comment | Program actually filters only on whether account/card context is present, not on role | [Card Servicing](modules/card-servicing.md#known-ambiguity) |
| Transaction ID generation | Read-highest-key-plus-one in COTRN02C and COBIL00C — not concurrency-safe; replace with a proper sequence/identity, keeping 16-digit format | business-rules-catalog.md exclusions; VAL-063/068 |

## Effort signals

- **COACTUPC (Account Update)** is the largest program (4,236 lines) and carries 24 of the 81
  validation rules — budget the most migration/testing effort there
  ([validation-rules.md §4](../validation-rules.md)).
- Shared constraints (11-digit account, 16-digit card, date edits, Y/N confirms, optimistic
  locking) are duplicated per program today; implement each once —
  see [cross-cutting patterns](rules-and-validations.md#cross-cutting-patterns).
