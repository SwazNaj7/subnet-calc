Phase 1: Build the static UI shell in index.html, styles.css, and script.js with input area, results cards, binary section, and future VLSM placeholders.
Phase 2: Implement IPv4 parsing and validation, including CIDR bounds, dotted-decimal mask parsing, mask-to-prefix conversion, and 32-bit integer conversion.
Phase 3: Add core subnet math for network address, broadcast address, subnet mask, and wildcard mask.
Phase 4: Add host calculations with correct /31 and /32 handling for total hosts, usable hosts, first usable, and last usable.
Phase 5: Wire computed results into the UI and add copy-to-clipboard buttons for each output value.
Phase 6: Add the binary breakdown view with octets plus network/host bit highlighting.
Phase 7: Add IP type tagging for private, public, loopback, multicast, and similar IPv4 classes.
Phase 8: Add the alternate dotted-decimal mask input mode and keep it synchronized with CIDR notation.
Phase 9: Polish error states, responsive layout, accessibility, and the dark/glass visual treatment.
Phase 10: Add VLSM as a separate stretch mode, starting with subnet count as the first supported input style.
Phase 11: Add the subnet split block diagram after VLSM is stable