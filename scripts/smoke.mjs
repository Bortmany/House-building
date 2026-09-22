// Browser smoke test for index.html (verify recipe step 4).
// Opens the generated page from file://, fills the sample house, checks a non-zero block count
// renders, and fails on any console error — at 1440 and 390 widths.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const url = 'file://' + path.resolve('index.html');
const browser = await chromium.launch();
let failed = false;
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url);
  // The page must expose a button that loads the sample house and one that calculates.
  await page.click('[data-action="load-sample"]');
  await page.click('[data-action="calculate"]');
  const blocks = await page.textContent('[data-result="blocks-total"]');
  const n = Number(String(blocks).replace(/[^0-9.]/g, ''));
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  const ok = n > 0 && errors.length === 0 && scrollW <= width;
  console.log(`${ok ? 'PASS' : 'FAIL'} @${width}px  blocks=${blocks?.trim()}  scrollWidth=${scrollW}  consoleErrors=${errors.length}`);
  errors.forEach(e => console.log('   ', e));
  if (!ok) failed = true;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
