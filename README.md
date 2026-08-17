# FunnyTIp — Fake Tip Kiosk

A payment-terminal-style prank/demo kiosk built with **Vite + React**. It mimics the
"how much do you want to tip?" screen you get handed at a checkout counter — but it's
just for fun.

## What it does

1. **Pick a tip %** — 0 / 15 / 18 / 20.
2. **Sign** on a canvas signature pad.
3. **Enter** first name, last name, and grade.
4. **Review the history** — attempts are grouped per person, showing grade, number of
   attempts, average tip %, and running total.

History is stored in the browser via **`localStorage`** (single-device, no login,
no backend). It persists across page refreshes.

> **Follow-up (not in scope for this dev pass):** syncing tip history across multiple
> devices would require a real backend. Flagged separately.

## Run locally

```bash
npm install
npm run dev      # start the Vite dev server (default http://localhost:5173)
```

## Build

```bash
npm run build    # outputs static assets to dist/
npm run preview  # preview the production build locally
```

## Deploy

Connected to Vercel — pushes to the default branch produce preview/dev deployments.
This project is **not** promoted to a production domain.

## License

Private / internal — see [LICENSE](./LICENSE).
