import { chromium } from "playwright";

/**
 * Full-screen / no-scroll verification (ADO-129).
 * Loads the built kiosk at mobile / iPad / desktop viewports and asserts the
 * page never scrolls (document scrollHeight/Width fit the viewport) on both the
 * entry view and the history view. Captures a screenshot per device.
 */

const OUT = process.env.PAPERCLIP_SCRATCH_DIR || ".";
const BASE = process.env.KIOSK_URL || "http://localhost:4317/";

const DEVICES = [
  { name: "mobile-iphone-se", width: 320, height: 568 },
  { name: "mobile-iphone-12", width: 390, height: 844 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
];

function scrollState() {
  const de = document.documentElement;
  return {
    scrollH: de.scrollHeight,
    clientH: de.clientHeight,
    scrollW: de.scrollWidth,
    clientW: de.clientWidth,
    vScroll: de.scrollHeight - de.clientHeight,
    hScroll: de.scrollWidth - de.clientWidth,
  };
}

const b = await chromium.launch();
let failures = 0;

for (const d of DEVICES) {
  const pg = await b.newPage({
    viewport: { width: d.width, height: d.height },
    deviceScaleFactor: 2,
  });
  await pg.goto(BASE, { waitUntil: "networkidle" });

  // --- entry view ---
  const entry = await pg.evaluate(scrollState);

  // Seed a few history entries, then open the history view.
  await pg.evaluate(() => {
    const rows = [];
    for (let i = 0; i < 12; i++) {
      rows.push({
        id: `seed-${i}`,
        firstName: `Person${i}`,
        lastName: "Example",
        grade: `${9 + (i % 4)}`,
        tipPercent: [0, 15, 18, 20][i % 4],
        signature: "x",
        ts: new Date(0).toISOString(),
      });
    }
    window.localStorage.setItem("tipKioskHistory", JSON.stringify(rows));
  });
  await pg.reload({ waitUntil: "networkidle" });
  await pg.click('button:has-text("History")');
  const history = await pg.evaluate(scrollState);

  const vBad = entry.vScroll > 1 || history.vScroll > 1;
  const hBad = entry.hScroll > 1 || history.hScroll > 1;
  const ok = !vBad && !hBad;
  if (!ok) failures++;

  console.log(
    `${ok ? "PASS" : "FAIL"} ${d.name} (${d.width}x${d.height})  ` +
      `entry[v=${entry.vScroll} h=${entry.hScroll}] ` +
      `history[v=${history.vScroll} h=${history.hScroll}]`
  );

  // Screenshot the entry view (clean state) for the PR.
  await pg.evaluate(() => window.localStorage.removeItem("tipKioskHistory"));
  await pg.reload({ waitUntil: "networkidle" });
  await pg.screenshot({ path: `${OUT}/kiosk-${d.name}.png`, fullPage: false });
  await pg.close();
}

await b.close();
console.log(failures === 0 ? "\nALL VIEWPORTS PASS" : `\n${failures} VIEWPORT(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
