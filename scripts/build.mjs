// Builds index.html: inlines src/calc.js and every docs/build-log/*.json into src/page.html.
// Run:  node scripts/build.mjs
// Deterministic: same inputs -> byte-identical output (the verify recipe diffs index.html).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = path.join(root, 'src', 'page.html');
const calcPath = path.join(root, 'src', 'calc.js');
const logDir = path.join(root, 'docs', 'build-log');
const outPath = path.join(root, 'index.html');

function die(message) {
  console.error('Build failed: ' + message);
  process.exit(1);
}

function read(file, what) {
  if (!fs.existsSync(file)) die(`${what} is missing (expected ${path.relative(root, file)}).`);
  return fs.readFileSync(file, 'utf8');
}

// 1. The page template and its two markers.
const page = read(pagePath, 'The page template');
for (const marker of ['<!--CALC-->', '<!--BUILDLOG-->']) {
  if (!page.includes(marker)) {
    die(`${path.relative(root, pagePath)} has no ${marker} marker — the build does not know where to inject.`);
  }
}

// 2. The calculator, turned from an ES module into a plain in-page script.
const calcSource = read(calcPath, 'The calculator (src/calc.js)');
const importLine = calcSource.split('\n').findIndex((l) => /^\s*import\s/.test(l));
if (importLine !== -1) {
  die(`src/calc.js line ${importLine + 1} uses "import". The page inlines it as a plain script, so it must have no imports.`);
}
if (/<\/script/i.test(calcSource)) {
  die('src/calc.js contains the text "</script", which would break the page it is inlined into.');
}
const calcInline = calcSource
  .split('\n')
  .map((line) => (line.startsWith('export ') ? line.slice('export '.length) : line))
  .join('\n')
  .trimEnd();

// 3. Every build-log record, oldest filename first, each tagged with its filename stem.
const logFiles = fs.existsSync(logDir)
  ? fs.readdirSync(logDir).filter((f) => f.endsWith('.json')).sort()
  : [];
const records = [];
for (const file of logFiles) {
  const full = path.join(logDir, file);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (err) {
    die(`docs/build-log/${file} is not valid JSON (${err.message}).`);
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  for (const rec of list) records.push({ ...rec, file: file.replace(/\.json$/, '') });
}
// "<" is escaped so no record text can close the JSON script tag.
const logJson = JSON.stringify(records, null, 2).replace(/</g, '\\u003c');

// 4. Write it out.
const html = page
  .replace('<!--CALC-->', '<script>\n' + calcInline + '\n</script>')
  .replace('<!--BUILDLOG-->', '<script type="application/json" id="build-log">' + logJson + '</script>');

fs.writeFileSync(outPath, html);
const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log(`Wrote ${path.relative(root, outPath)} — ${kb} KB, ${records.length} build-log record${records.length === 1 ? '' : 's'}.`);
