# Subnet Calculator Implementation Plan

## Summary

Build the calculator as a vanilla HTML/CSS/JS single-page app, keeping the current split between markup, styling, and logic. The UI shell, parsing, validation, core subnet math, and host math are already complete. The remaining work now starts with output wiring, then binary teaching views, address classification, alternate mask mode, polish, and later stretch features for VLSM and a subnet block diagram.

## Technical Context

- Frontend stack: vanilla HTML, CSS, and JavaScript.
- Scope: IPv4 only for v1.
- Input model: separate IP and prefix/mask controls with a mode toggle.
- Styling direction: dark glass UI with the supplied green palette as the visual system.
- Current state: the static shell exists in `index.html` and `styles.css`; `script.js` already contains parsing, validation, core subnet math helpers, and host math helpers.

## Constitution Check

- Keep the implementation small, explicit, and easy to reason about.
- Prefer clear naming and simple data flow over abstractions that would obscure the subnet math.
- Keep the UI responsive and accessible, including keyboard focus and reduced-motion support.
- Treat error states as guidance, not decoration.

## Applied Guidelines

- Use the subject matter as the design anchor: subnet calculation, binary breakdowns, and IP classification should shape the UI and copy.
- Keep the signature visual idea concentrated in one place; avoid decorative clutter elsewhere.
- Make labels and errors plain and user-facing, not system-centric.

## Implementation Steps

### Step 1: [Cross-cutting] Wire math to the UI

**REQ-012** Render computed outputs in the result cards.
**REQ-013** Add copy-to-clipboard actions for output values.

- Replace placeholder result values in `index.html` with dynamic rendering from `script.js`.
- Attach copy actions to each output card and keep the button labels clear.
- Surface validation errors near the input controls without leaving stale subnet results visible.

### Step 2: [Cross-cutting] Binary breakdown view

**REQ-014** Show IP and subnet mask in binary.
**REQ-015** Color-code network bits versus host bits.

- Render the IP and subnet mask as 32-bit binary rows in `script.js`.
- Highlight network and host bits using the current prefix.
- Keep the view readable on mobile and aligned to the teaching goal.

### Step 3: [Cross-cutting] IP type detection

**REQ-016** Tag the address as private, public, loopback, multicast, or similar.

- Add IPv4 classification helpers in `script.js`.
- Render the classification badge in the address type panel.

### Step 4: [Cross-cutting] Alternate mask mode

**REQ-017** Keep CIDR and dotted-decimal mask input modes synchronized.

- Toggle the visible control between CIDR prefix and subnet mask input.
- Convert values in both directions so the user can switch modes without losing state.
- Validate mismatches and malformed input with direct, readable error copy.

### Step 5: [Cross-cutting] Polish and resilience

**REQ-018** Improve error states, responsiveness, and visual polish.

- Tune spacing, empty states, and focus states after the calculator is functional.
- Verify mobile layout and keyboard interaction.

### Step 6: [Cross-cutting] Stretch VLSM mode

**REQ-019** Add VLSM subnetting mode.

- Introduce VLSM as a separate mode after the core subnet calculator is stable.
- Start with subnet count as the first supported VLSM input style.

### Step 7: [Cross-cutting] Stretch subnet block diagram

**REQ-020** Add a visual block diagram of the subnet split.

- Use the same subnet model to visualize address-space partitioning.
- Keep this feature separate from the core calculator so it can land later without risk.

## Project Structure

- `index.html` - static structure and result containers.
- `styles.css` - visual system, responsive layout, and state styling.
- `script.js` - parsing, validation, calculations, rendering, and clipboard behavior.
- `plan.md` - this implementation plan.

## Requirement Mapping

| REQ ID | Description | Plan Items | Implementation Evidence |
|--------|-------------|------------|------------------------|
| REQ-012 | Render computed outputs in the result cards | Step 1 | `index.html`, `script.js` render bindings |
| REQ-013 | Add copy-to-clipboard actions | Step 1 | `script.js` clipboard handlers |
| REQ-014 | Show IP and subnet mask in binary | Step 2 | `script.js` binary rendering helpers |
| REQ-015 | Color-code network bits versus host bits | Step 2 | `styles.css`, `script.js` binary bit classes |
| REQ-016 | Tag private/public/loopback/multicast addresses | Step 3 | `script.js` classification helpers, info badge rendering |
| REQ-017 | Keep CIDR and mask input modes synchronized | Step 4 | `script.js` mode switch and value sync logic |
| REQ-018 | Improve error states, responsiveness, and polish | Step 5 | `styles.css`, `index.html`, `script.js` error states |
| REQ-019 | Add VLSM subnetting mode | Step 6 | future VLSM UI and logic in `script.js` |
| REQ-020 | Add a visual block diagram of the subnet split | Step 7 | future visualization in `index.html`, `styles.css`, `script.js` |