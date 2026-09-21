# Synthetic multi-card payment fixture

This fixture is deliberately outside `00.phase-1-input/` and is not a legacy export. The canonical samples contain one card per account and therefore cannot establish the payment-selection behavior required by the migration.

`multi-card-payment.json` supplies two cards for one account in reverse order. A payment implementation must select `1000000000000001`, the lexically lowest 16-byte card number, while preserving the full account balance amount and incrementing the account version once.
