# Glossary

[← Overview](README.md)

The authoritative business glossary — party, account, card, transaction, pricing, and security
terms with their source fields — is the Phase 1 artifact
**[business-glossary.md](../business-glossary.md)**. A technical/mainframe-term glossary
(CICS, BMS, VSAM, COMMAREA, GDG, …) is in the orientation wiki:
**[wiki/glossary.md](../wiki/glossary.md)**. This page only lists the handful of terms used
throughout this application wiki.

| Term | Meaning (see source glossaries for detail) |
|---|---|
| Account | Credit relationship with limits, balances, cycle amounts; 11-digit ID ([ENTITY-002](data-model.md#entity-catalog)) |
| Admin / Administrator | User with SEC-USR-TYPE `A`; routed to the Admin Menu; maintains users ([User Roles](user-roles.md)) |
| Bill payment | Online full-balance settlement posting a fixed-profile transaction ([Bill Payment](modules/bill-payment.md)) |
| Card cross-reference (XREF) | Junction record linking card ↔ customer ↔ account; the only Customer↔Account link ([ENTITY-004](data-model.md#entity-catalog)) |
| COMMAREA | Session context (user ID, role, navigation, selected keys) passed between screens ([Architecture](architecture.md#runtime-model)) |
| FICO score | Customer credit score; valid range 300–850 (VAL-021) |
| Processing date | Date a transaction was processed — the date the report filters on, vs. origination date ([RULE-DECISION-004](../business-rules-catalog.md)) |
| Pseudo-conversational | CICS style: each screen interaction is a fresh transaction; state lives in the COMMAREA ([Architecture](architecture.md)) |
| Regular user | SEC-USR-TYPE `U`; routed to the Main Menu; performs customer servicing ([User Roles](user-roles.md)) |
| Screen (BMS map) | One 3270 panel; 17 exist ([Component Inventory](component-inventory.md)) |
| Transaction (business) | A posted card charge/credit; 16-digit ID ([ENTITY-005](data-model.md#entity-catalog)) |
| Transaction (CICS) | A 4-character code (e.g. CC00) that starts a program — distinct from the business transaction |
| Transaction type / category | 2-digit type and 4-digit type+category classification codes ([ENTITY-009/010](data-model.md#entity-catalog)) |
