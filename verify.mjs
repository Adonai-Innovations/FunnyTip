import { chromium } from "playwright";
const OUT = process.env.PAPERCLIP_SCRATCH_DIR;
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1172/2, height: 1504/2 }, deviceScaleFactor: 2 });
await pg.goto("http://localhost:4317/", { waitUntil: "networkidle" });
// Fill the form to reproduce the reviewer's screenshot state
await pg.fill('input[placeholder="First name"]', "");
await pg.fill('input[placeholder="Last name"]', "");
// Measure overflow: does last-name right edge exceed the card right edge?
const res = await pg.evaluate(() => {
  const inputs = [...document.querySelectorAll('input')];
  const last = inputs.find(i => i.placeholder === "Last name");
  const card = last.closest('div[style*="max-width"]') || last.closest('div');
  // find the card: walk up to element with border-radius 20 (the card padding 22)
  let card2 = last;
  while (card2 && !(getComputedStyle(card2).borderRadius === "20px")) card2 = card2.parentElement;
  const cardRect = (card2||card).getBoundingClientRect();
  const lastRect = last.getBoundingClientRect();
  const first = inputs.find(i => i.placeholder === "First name").getBoundingClientRect();
  return {
    cardRight: cardRect.right, cardLeft: cardRect.left,
    lastRight: lastRect.right, lastLeft: lastRect.left,
    firstLeft: first.left, firstRight: first.right,
    overflowPx: +(lastRect.right - cardRect.right).toFixed(1),
    docScrollW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
  };
});
console.log(JSON.stringify(res, null, 2));
await pg.screenshot({ path: `${OUT}/fixed-entry.png`, fullPage: false });
await b.close();
