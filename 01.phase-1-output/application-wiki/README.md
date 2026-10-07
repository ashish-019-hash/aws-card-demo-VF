# CardDemo — Application Wiki (Phase 1 Synthesis)

A navigable, cross-referenced view of the legacy **CardDemo** credit-card management
application, synthesized entirely from the completed Phase 1 extraction artifacts and the
orientation wiki. No original source code was re-analyzed to build these pages; every fact
traces back to one of the source documents listed below.

## What CardDemo does

CardDemo is an online CICS/COBOL application (17 3270 screens) that lets bank staff and
administrators sign on, look up and maintain customer accounts and credit cards, browse and
record card transactions, pay account bills in full, request batch transaction reports, and
(for administrators) manage the application's users. Two roles exist — regular users (`U`)
and administrators (`A`) — routed to different menus after sign-on.
(Sources: [screen-flow.md](../screen-flow.md) Summary; [user-stories.md](../user-stories.md) roles table.)

## Wiki pages

| Page | Contents |
|---|---|
| [Architecture & Technology Summary](architecture.md) | Tech stack, runtime model, online/batch split |
| [User Types & Roles](user-roles.md) | The three user types and what each can do |
| [Component Inventory](component-inventory.md) | All screens/transactions/programs, batch components, shared utilities |
| [Data Model](data-model.md) | The 11 business entities at a glance, with relationships |
| [Business Rules & Validation Index](rules-and-validations.md) | Browsable index of all 7 business rules and 81 validation rules, by module |
| [Modernization Notes](modernization-notes.md) | Migration heads-ups surfaced by Phase 1 |
| [Glossary](glossary.md) | Domain terms, with links to the full glossaries |

### Functional modules (one page each)

| Module | Screens | Stories |
|---|---|---|
| [Sign-on & Session](modules/sign-on.md) | COSGN00 | STORY-001–003 |
| [Menus & Navigation](modules/menus.md) | COMEN01, COADM01 | STORY-004–005 |
| [Account Servicing](modules/account-servicing.md) | COACTVW, COACTUP | STORY-006–007 |
| [Credit Card Servicing](modules/card-servicing.md) | COCRDLI, COCRDSL, COCRDUP | STORY-008–011 |
| [Transactions](modules/transactions.md) | COTRN00, COTRN01, COTRN02 | STORY-012–016 |
| [Bill Payment](modules/bill-payment.md) | COBIL00 | STORY-017 |
| [Transaction Reports](modules/reporting.md) | CORPT00 + batch TRANREPT | STORY-018–019 |
| [User Security Administration](modules/user-administration.md) | COUSR00–COUSR03 | STORY-020–024 |

## Source documents (Phase 1 artifacts)

All detail lives in the extraction artifacts; this wiki summarizes and cross-references them:

| Artifact | Owns |
|---|---|
| [business-entities.md](../business-entities.md) | 11 entities, field-level layouts, keys, relationships (ENTITY-001…011) |
| [business-rules-catalog.md](../business-rules-catalog.md) | 7 business rules (RULE-CALC/THRESHOLD/DECISION-*) |
| [business-glossary.md](../business-glossary.md) | Plain-language business term definitions |
| [validation-rules.md](../validation-rules.md) | 81 validation rules (RULE-VAL-001…081) + dependency diagram ([SVG](../validation-dependencies.svg)) |
| [screen-flow.md](../screen-flow.md) | 17 screens: fields, data sources, navigation, flow diagram |
| [user-stories.md](../user-stories.md) | 24 user stories with acceptance criteria (STORY-001…024) |
| [Orientation wiki](../wiki/README.md) | Architecture-level orientation (tech stack, CICS resources, known gaps) |
