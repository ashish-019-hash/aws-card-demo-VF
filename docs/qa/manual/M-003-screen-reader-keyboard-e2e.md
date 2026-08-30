# M-003 — Screen-reader keyboard E2E

- **Owner:** Accessibility lead
- **Status:** READY_FOR_EXECUTION

## Prerequisites
- Staging frontend, seeded test identity, keyboard-only test device, and supported screen reader/browser pair.

## Review steps
1. Traverse sign-in, account, card, transaction, billing, report, and administrative flows using only keyboard.
2. Verify visible focus, logical focus order, no keyboard trap, error announcements, labels, headings, and dynamic status feedback with a screen reader.
3. Verify modal/dialog and route-change focus behavior; save recordings or detailed observation notes.
4. File defects with exact route, control, assistive technology, browser, and reproduction steps.

## Required evidence and decision
- Completed route checklist, screen-reader/browser versions, recordings or notes, defects, and accessibility lead decision.
- **Pass:** critical flows are keyboard-operable and announced accurately.
- **Fail:** a critical flow traps focus, lacks an accessible name/state, or cannot be completed without a pointer.
