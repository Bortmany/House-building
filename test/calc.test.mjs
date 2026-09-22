/*
 * Core-guarantee tests (docs/CONVENTIONS.md golden rule + engineering standards section 7).
 * The promise under test: every number on screen is traceable to a named row in
 * docs/research/assumptions.md, and a value the user overwrites is the value the maths uses.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { DEFAULTS, ASSUMPTION_NOTES, LIMITS, SAMPLE_HOUSE, generateRooms, validateHouse, estimate } from '../src/calc.js';

const here = dirname(fileURLToPath(import.meta.url));
const assumptionsPath = join(here, '..', 'docs', 'research', 'assumptions.md');
const CONFIDENCES = ['Certain', 'Likely', 'Guessing'];

/* Keys in ASSUMPTION_NOTES that are documented in prose rather than in a table row. */
const NOTE_KEYS_NOT_IN_TABLES = ['construction_system'];

function assumptionKeysFromDoc() {
  const md = readFileSync(assumptionsPath, 'utf8');
  const keys = [];
  for (const line of md.split('\n')) {
    /* real assumption keys are snake_case; this skips the "| step |" column of the
     * worked-example table in section 6 and the "| key |" headers. */
    const m = /^\|\s*([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\s*\|/.exec(line);
    if (m) keys.push(m[1]);
  }
  return keys;
}

function walkNumbers(value, path, seen) {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `${path} is not a finite number (got ${value})`);
    return;
  }
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) walkNumbers(value[k], `${path}.${k}`, seen);
  }
}

/* ---------- the assumptions table ---------- */

test('every default is fully documented and editable', () => {
  const keys = Object.keys(DEFAULTS);
  assert.ok(keys.length > 20, 'expected the full assumptions table');
  for (const key of keys) {
    const d = DEFAULTS[key];
    assert.equal(typeof d.value, 'number', `${key}: value must be a number`);
    assert.ok(Number.isFinite(d.value), `${key}: value must be finite`);
    for (const field of ['unit', 'label', 'group', 'rationale', 'source']) {
      assert.equal(typeof d[field], 'string', `${key}: ${field} must be text`);
      assert.ok(d[field].length > 0, `${key}: ${field} must not be blank`);
    }
    assert.ok(['blocks', 'walls', 'concrete', 'steel', 'prices', 'wastage'].includes(d.group), `${key}: unknown group ${d.group}`);
    assert.ok(CONFIDENCES.includes(d.confidence), `${key}: confidence must be one of ${CONFIDENCES.join(', ')}`);
    assert.match(d.lastChecked, /^\d{4}-\d{2}-\d{2}$/, `${key}: needs a last-checked date`);
    assert.ok(d.sourceUrl === null || typeof d.sourceUrl === 'string', `${key}: sourceUrl must be a link or null`);
  }
});

test('the defaults table and assumptions.md say exactly the same thing', () => {
  const docKeys = assumptionKeysFromDoc();
  const noteKeys = ASSUMPTION_NOTES.map((n) => n.key);
  const covered = new Set([...Object.keys(DEFAULTS), ...noteKeys]);
  for (const key of docKeys) {
    assert.ok(covered.has(key), `assumptions.md documents "${key}" but the code does not use it`);
  }
  const documented = new Set(docKeys);
  for (const key of Object.keys(DEFAULTS)) {
    assert.ok(documented.has(key), `DEFAULTS has "${key}" with no row in assumptions.md — untraceable`);
  }
  for (const key of noteKeys) {
    assert.ok(documented.has(key) || NOTE_KEYS_NOT_IN_TABLES.includes(key), `ASSUMPTION_NOTES has "${key}" with no source in assumptions.md`);
  }
  assert.deepEqual(noteKeys, ['construction_system', 'concrete_grade_structural', 'rooms_are_all_spaces']);
});

test('every word-assumption note carries its source and date', () => {
  for (const note of ASSUMPTION_NOTES) {
    assert.equal(typeof note.value, 'string');
    assert.ok(note.rationale.length > 0);
    assert.ok(note.source.length > 0);
    assert.ok(CONFIDENCES.includes(note.confidence));
    assert.match(note.lastChecked, /^\d{4}-\d{2}-\d{2}$/);
  }
});

/* ---------- the sample house ---------- */

test('the sample house is a valid, complete floor of about 200 m2', () => {
  const clean = validateHouse(SAMPLE_HOUSE);
  assert.equal(clean.rooms.length, SAMPLE_HOUSE.rooms.length);
  const area = SAMPLE_HOUSE.rooms.reduce((s, r) => s + r.lengthM * r.widthM, 0);
  assert.ok(area >= 195 && area <= 205, `sample floor area ${area} m2 should be 195-205 m2`);
  const names = SAMPLE_HOUSE.rooms.map((r) => r.name.toLowerCase()).join(' ');
  for (const space of ['majlis', 'living', 'dining', 'kitchen', 'bedroom', 'bathroom', 'corridor', 'store']) {
    assert.ok(names.includes(space), `the sample house should list a ${space}`);
  }
});

test('the sample house lands in the ranges assumptions.md section 7 expects', () => {
  const r = estimate(SAMPLE_HOUSE);
  assert.ok(r.totals.blocks >= 8000 && r.totals.blocks <= 12000, `blocks ${r.totals.blocks}`);
  assert.ok(r.totals.concreteM3 >= 110 && r.totals.concreteM3 <= 140, `concrete ${r.totals.concreteM3}`);
  assert.ok(r.totals.steelTonnes >= 11 && r.totals.steelTonnes <= 16, `steel ${r.totals.steelTonnes}`);
});

/* Golden snapshot — written from what the code produces today, so any formula change shows up
 * as a deliberate diff in this test rather than a silent change on the page. */
test('sample house headline totals (golden snapshot)', () => {
  const t = estimate(SAMPLE_HOUSE).totals;
  assert.equal(t.blocks, 8053);
  assert.equal(t.blocksExternal, 4408);
  assert.equal(t.blocksInternal, 3645);
  assert.equal(t.concreteM3, 129.08);
  assert.equal(t.steelTonnes, 12.909);
  assert.equal(t.costBlocksOmr, 1794.55);
  assert.equal(t.costConcreteOmr, 4130.56);
  assert.equal(t.costSteelOmr, 3356.26);
  assert.equal(t.costOmr, 9281.37);
});

test('totals are exactly the sum of the element rows', () => {
  const r = estimate(SAMPLE_HOUSE);
  const rows = Object.values(r.elements);
  const sum = (f) => rows.reduce((s, row) => s + f(row), 0);
  assert.equal(sum((x) => x.blocks), r.totals.blocks);
  assert.equal(r.totals.blocksExternal + r.totals.blocksInternal, r.totals.blocks);
  assert.ok(Math.abs(sum((x) => x.concreteM3) - r.totals.concreteM3) < 1e-6);
  assert.ok(Math.abs(sum((x) => x.steelKg) - r.totals.steelKg) < 1e-6);
  assert.ok(Math.abs(sum((x) => x.costOmr) - r.totals.costOmr) < 0.05, 'element costs should add up to the total');
  assert.ok(Math.abs(r.totals.costBlocksOmr + r.totals.costConcreteOmr + r.totals.costSteelOmr - r.totals.costOmr) < 1e-6);
  assert.equal(r.totals.steelTonnes, Math.round(r.totals.steelKg) / 1000);
});

test('every element row reports the wastage that applied to it', () => {
  const r = estimate(SAMPLE_HOUSE, { block_wastage_pct: 8, concrete_wastage_pct: 6 });
  assert.equal(r.elements.wallsExternal.wastagePct, 8);
  assert.equal(r.elements.wallsInternal.wastagePct, 8);
  assert.equal(r.elements.slabs.wastagePct, 6);
  const plain = estimate(SAMPLE_HOUSE);
  assert.ok(r.totals.blocks > plain.totals.blocks, 'more block wastage means more blocks');
  assert.ok(r.totals.concreteM3 > plain.totals.concreteM3, 'more concrete wastage means more concrete');
});

/* ---------- the m2 shortcut ---------- */

test('generateRooms fills a floor to within 2% of the size asked for', () => {
  for (const target of [60, 200, 800]) {
    const rooms = generateRooms(target);
    const area = rooms.reduce((s, r) => s + r.lengthM * r.widthM, 0);
    assert.ok(Math.abs(area - target) <= target * 0.02, `${target} m2 -> ${area} m2`);
    assert.ok(rooms.length >= 5, 'a whole floor should have several spaces');
    for (const room of rooms) {
      assert.ok(room.name.length > 0);
      assert.ok(room.lengthM >= LIMITS.roomSideM[0] && room.lengthM <= LIMITS.roomSideM[1]);
      assert.ok(room.widthM >= LIMITS.roomSideM[0] && room.widthM <= LIMITS.roomSideM[1]);
    }
    /* generated rooms must survive the same validation a typed list goes through */
    validateHouse({ floors: 1, wallHeightM: 3, rooms });
  }
});

test('generateRooms gives the same answer every time', () => {
  assert.deepEqual(generateRooms(250), generateRooms(250));
  assert.notDeepEqual(generateRooms(120), generateRooms(250));
});

test('generateRooms refuses sizes outside the limits', () => {
  for (const bad of [0, 10, 5000, -50, NaN, 'big']) {
    assert.throws(() => generateRooms(bad), /floor size/i);
  }
});

/* ---------- overrides: the user's number must win ---------- */

test('overriding a block price changes the block cost and nothing else', () => {
  const plain = estimate(SAMPLE_HOUSE);
  const edited = estimate(SAMPLE_HOUSE, { price_omr_block_200: 0.5 });
  assert.equal(edited.totals.blocks, plain.totals.blocks);
  assert.equal(edited.totals.concreteM3, plain.totals.concreteM3);
  assert.equal(edited.totals.steelKg, plain.totals.steelKg);
  assert.equal(edited.totals.costConcreteOmr, plain.totals.costConcreteOmr);
  assert.equal(edited.totals.costSteelOmr, plain.totals.costSteelOmr);
  assert.ok(edited.totals.costBlocksOmr > plain.totals.costBlocksOmr);
  assert.equal(edited.totals.costBlocksOmr, Math.round((plain.totals.blocksExternal * 0.5 + plain.elements.wallsInternal.costOmr) * 100) / 100);
  assert.ok(edited.totals.costOmr > plain.totals.costOmr);
});

test('an overridden assumption is shown as overridden and keeps its default', () => {
  const r = estimate(SAMPLE_HOUSE, { price_omr_block_200: 0.5 });
  assert.equal(r.assumptionsUsed.length, Object.keys(DEFAULTS).length);
  assert.deepEqual(r.assumptionsUsed.map((x) => x.key), Object.keys(DEFAULTS));
  const row = r.assumptionsUsed.find((x) => x.key === 'price_omr_block_200');
  assert.equal(row.value, 0.5);
  assert.equal(row.defaultValue, DEFAULTS.price_omr_block_200.value);
  assert.equal(row.overridden, true);
  assert.equal(row.lastChecked, DEFAULTS.price_omr_block_200.lastChecked);
  assert.equal(row.source, DEFAULTS.price_omr_block_200.source);
  for (const other of r.assumptionsUsed) {
    if (other.key !== 'price_omr_block_200') {
      assert.equal(other.overridden, false);
      assert.equal(other.value, other.defaultValue);
    }
  }
});

test('every quantity assumption actually moves the answer when overridden', () => {
  const plain = estimate(SAMPLE_HOUSE);
  const movers = {
    blocks_per_m2_wall: (r) => r.totals.blocks,
    opening_deduction_pct: (r) => r.totals.blocks,
    ext_perimeter_shape_factor: (r) => r.totals.blocksExternal,
    int_wall_per_room_factor: (r) => r.totals.blocksInternal,
    concrete_m3_per_m2_slab: (r) => r.totals.concreteM3,
    rebar_kg_per_m3_columns: (r) => r.totals.steelKg,
    price_omr_readymix_c30_m3: (r) => r.totals.costConcreteOmr,
    price_omr_rebar_tonne: (r) => r.totals.costSteelOmr
  };
  for (const [key, read] of Object.entries(movers)) {
    const edited = estimate(SAMPLE_HOUSE, { [key]: DEFAULTS[key].value * 2 });
    assert.notEqual(read(edited), read(plain), `overriding ${key} should change the result`);
  }
});

test('a bad override is refused in plain English', () => {
  assert.throws(() => estimate(SAMPLE_HOUSE, { not_a_real_key: 1 }), /not_a_real_key/);
  assert.throws(() => estimate(SAMPLE_HOUSE, { price_omr_block_200: -1 }), /cannot be negative/);
  assert.throws(() => estimate(SAMPLE_HOUSE, { price_omr_block_200: NaN }), /should be a number/);
  assert.throws(() => estimate(SAMPLE_HOUSE, { blocks_per_m2_wall: 'twelve' }), /should be a number/);
  assert.throws(() => estimate(SAMPLE_HOUSE, { blocks_per_m2_wall: Infinity }), /should be a number/);
});

/* ---------- input safety ---------- */

test('bad input throws a plain-English error that names the field', () => {
  const rooms = SAMPLE_HOUSE.rooms;
  const cases = [
    [{ floors: 0, wallHeightM: 3, rooms }, /floors/i],
    [{ floors: 5, wallHeightM: 3, rooms }, /floors/i],
    [{ floors: 'two', wallHeightM: 3, rooms }, /floors/i],
    [{ floors: 2, wallHeightM: 2, rooms }, /wall height/i],
    [{ floors: 2, wallHeightM: 5, rooms }, /wall height/i],
    [{ floors: 2, wallHeightM: 3, rooms: [] }, /room/i],
    [{ floors: 2, wallHeightM: 3, rooms: [{ name: 'Kitchen', lengthM: 4, widthM: 0 }] }, /width of "kitchen"/i],
    [{ floors: 2, wallHeightM: 3, rooms: [{ name: 'Kitchen', lengthM: 25, widthM: 4 }] }, /length of "kitchen"/i],
    [null, /describe the house/i],
    ['a house', /describe the house/i]
  ];
  for (const [house, pattern] of cases) {
    assert.throws(() => estimate(house), (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, pattern);
      assert.ok(!/NaN|undefined|TypeError/.test(err.message), 'error text must be plain English');
      return true;
    }, `expected ${JSON.stringify(house)} to be refused`);
  }
});

test('a room with no name is named for the user instead of failing', () => {
  const clean = validateHouse({ floors: 1, wallHeightM: 3, rooms: [{ name: '   ', lengthM: 6, widthM: 6 }, { lengthM: 5, widthM: 5 }] });
  assert.equal(clean.rooms[0].name, 'Room 1');
  assert.equal(clean.rooms[1].name, 'Room 2');
});

test('a valid result never contains NaN or Infinity anywhere', () => {
  const houses = [
    SAMPLE_HOUSE,
    { floors: 1, wallHeightM: 2.4, rooms: generateRooms(30) },
    { floors: 4, wallHeightM: 4.5, rooms: generateRooms(1500) }
  ];
  for (const house of houses) {
    walkNumbers(estimate(house), 'result', new Set());
    walkNumbers(estimate(house, { block_wastage_pct: 0, price_omr_block_150: 0 }), 'result(zeroed)', new Set());
  }
});

test('results carry plain-English caveats', () => {
  const notes = estimate(SAMPLE_HOUSE).notes;
  assert.ok(notes.length >= 4);
  assert.ok(notes.some((n) => /not quotes/i.test(n)), 'must say the prices are not quotes');
  assert.ok(notes.some((n) => /labour/i.test(n)), 'must say what is excluded');
  assert.ok(notes.some((n) => /guessing/i.test(n)), 'must flag the least reliable prices');
});

/* ---------- the geometry behaves the way a builder would expect ---------- */

test('doubling the floors doubles the blocks and the slab concrete but not the footings', () => {
  const one = estimate({ ...SAMPLE_HOUSE, floors: 1 });
  const two = estimate({ ...SAMPLE_HOUSE, floors: 2 });
  assert.ok(Math.abs(two.totals.blocks - one.totals.blocks * 2) <= 2, 'blocks should double (allowing for rounding up)');
  assert.ok(Math.abs(two.elements.slabs.concreteM3 - one.elements.slabs.concreteM3 * 2) < 0.02);
  assert.equal(two.elements.footings.concreteM3, one.elements.footings.concreteM3);
  assert.equal(two.elements.groundSlab.concreteM3, one.elements.groundSlab.concreteM3);
  assert.equal(two.inputs.builtUpAreaM2, one.inputs.builtUpAreaM2 * 2);
});
