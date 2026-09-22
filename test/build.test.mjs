// Checks that scripts/build.mjs produces a page whose inlined calculator actually works.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'house-build-')), 'index.html');

test('the build writes a page with a working, inlined calculator', () => {
  const stdout = execFileSync(process.execPath, [path.join(root, 'scripts', 'build.mjs'), outPath], {
    cwd: root, encoding: 'utf8',
  });
  assert.match(stdout, /build-log record/);
  const html = fs.readFileSync(outPath, 'utf8');

  // No ES-module syntax survives into the page.
  const exportLine = html.split('\n').findIndex((l) => l.startsWith('export '));
  assert.equal(exportLine, -1, `line ${exportLine + 1} of the built page still starts with "export "`);
  assert.ok(!html.includes('<!--CALC-->'), 'the CALC marker was not replaced');
  assert.ok(!html.includes('<!--BUILDLOG-->'), 'the BUILDLOG marker was not replaced');

  // The calculator between the first pair of script tags parses and exposes its two key names.
  // (Sliced by index, not split: the calculator's own comments mention the word script.)
  const start = html.indexOf('<script>') + '<script>'.length;
  const calc = html.slice(start, html.indexOf('</script>', start));
  const load = new Function(calc + '\nreturn { estimate: estimate, DEFAULTS: DEFAULTS, SAMPLE_HOUSE: SAMPLE_HOUSE };');
  const api = load();
  assert.equal(typeof api.estimate, 'function');
  assert.equal(typeof api.DEFAULTS, 'object');
  assert.ok(api.estimate(api.SAMPLE_HOUSE, {}).totals.blocks > 0);
});

test('the build log is inlined as readable JSON', () => {
  const html = fs.readFileSync(outPath, 'utf8');
  const tag = '<script type="application/json" id="build-log">';
  const from = html.indexOf(tag) + tag.length;
  const json = html.slice(from, html.indexOf('</script>', from));
  const records = JSON.parse(json.replace(/\\u003c/g, '<'));
  assert.ok(Array.isArray(records) && records.length > 0);
  for (const r of records) {
    assert.equal(typeof r.file, 'string', 'every record carries its filename stem');
    assert.equal(typeof r.agent, 'string');
  }
});
