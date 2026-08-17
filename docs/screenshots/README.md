# Before / after screenshots (ADO-129)

- `before-last-name-overflow.png` — board-reported bug: the **Last name** input
  bleeds past the right edge of the card.
- `after-kiosk.png` — fixed: both name inputs constrained inside the card
  (`flex: 1` + `min-width: 0` + `box-sizing: border-box`).
- `after-history.png` — history screen: grouped by person, grade pill, and
  Attempts / Average % / Total % (persists across page refresh via localStorage).

Regenerate with `node verify.mjs` (or the e2e harness) against a local
`npm run build && npm run preview`.
