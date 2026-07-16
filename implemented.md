# Implemented Features

## Completed Roadmap Items

- REQ-001: Accept IP + CIDR notation.
- REQ-002: Accept dotted-decimal subnet mask as an alternate input mode.
- REQ-003: Validate malformed IPs, invalid CIDR values, and invalid masks.
- REQ-004: Compute network address.
- REQ-005: Compute broadcast address.
- REQ-006: Compute subnet mask and wildcard mask.
- REQ-007: Compute total hosts.
- REQ-008: Compute usable hosts.
- REQ-009: Compute first usable host.
- REQ-010: Compute last usable host.
- REQ-011: Handle /31 and /32 correctly.
- REQ-012: Render computed outputs in the result cards.
- REQ-013: Add copy-to-clipboard actions for output values.

## Notes

- The UI shell in `index.html` and `styles.css` is already in place.
- `script.js` now contains the parsing, validation, core subnet math helpers, host math helpers, and result-card rendering used by these completed requirements.
- Copy buttons are wired into the result cards; clipboard writes still depend on browser support in the running environment.