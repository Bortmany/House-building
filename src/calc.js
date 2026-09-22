/*
 * House-building estimator — pure calculation module.
 *
 * Golden rule (docs/CONVENTIONS.md): every number this file produces is traceable to a named,
 * documented row in docs/research/assumptions.md. DEFAULTS below is the ONLY place a price or a
 * quantity constant lives, every row carries its source, confidence and "last checked" date, and
 * every row can be overwritten by the user (the `overrides` argument to estimate()).
 *
 * No DOM, no network, no imports. This file must also run as a classic <script> after the build
 * step strips the leading `export ` keyword, so: no import/export-from, no top-level await, and
 * only `export const` / `export function` at column 0.
 */

/* Every numeric assumption, in the order the UI shows it.
 * Keys map 1:1 to docs/research/assumptions.md sections 1-5 and 7. */
export const DEFAULTS = {
  /* --- Section 1: blocks --- */
  block_ext_length: {
    value: 400, unit: 'mm', label: 'External block length', group: 'blocks', used: false,
    rationale: 'Standard GCC hollow block face size (400x200xh).',
    source: 'Al Madina Cement Products (mcp.om) product range', sourceUrl: 'https://mcp.om',
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  block_ext_height: {
    value: 200, unit: 'mm', label: 'Block face height', group: 'blocks', used: false,
    rationale: 'Standard block face height.',
    source: 'Al Madina Cement Products (mcp.om)', sourceUrl: 'https://mcp.om',
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  block_ext_thickness: {
    value: 200, unit: 'mm', label: 'External wall block thickness', group: 'blocks', used: false,
    rationale: 'Typical external wall block — load path plus insulation mass.',
    source: 'Common GCC villa spec (Muscat Municipality practice)', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  block_int_thickness: {
    value: 150, unit: 'mm', label: 'Internal wall block thickness', group: 'blocks', used: false,
    rationale: 'Typical internal partition block, non-load-bearing.',
    source: 'Common GCC villa spec', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  mortar_joint_mm: {
    value: 10, unit: 'mm', label: 'Mortar joint thickness', group: 'blocks', used: false,
    rationale: 'Standard bed and head joint.',
    source: 'General masonry practice (BS 5628 / regional norm)', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  blocks_per_m2_wall: {
    value: 12.5, unit: 'pcs/m2', label: 'Blocks per square metre of wall', group: 'blocks', used: true,
    rationale: 'A 400x200 block plus a 10 mm joint covers about 0.0861 m2 (11.6 blocks/m2), rounded up to the estimator rule of thumb of 12.5 to cover cutting.',
    source: 'Standard block-count rule of thumb used by GCC estimators', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  block_wastage_pct: {
    value: 5, unit: '%', label: 'Block wastage', group: 'wastage', used: true,
    rationale: 'Breakage and cutting at corners and openings.',
    source: 'Common contractor allowance', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },

  /* --- Section 2: wall geometry --- */
  wall_height_default_m: {
    value: 3.0, unit: 'm', label: 'Default wall height', group: 'walls', used: false,
    rationale: 'Typical Muscat villa floor-to-floor height.',
    source: 'Common GCC villa spec', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  ext_wall_perimeter_factor: {
    value: 1.0, unit: '-', label: 'External wall length factor (take-off method)', group: 'walls', used: false,
    rationale: 'External wall length equals the building perimeter. Superseded for this calculator by ext_perimeter_shape_factor (section 7), which derives the perimeter from floor area; kept here for traceability.',
    source: 'Standard quantity take-off method', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  int_wall_per_room_factor: {
    value: 0.5, unit: '-', label: 'Internal wall length per space', group: 'walls', used: true,
    rationale: 'Internal wall length is about 0.5 x (length + width) per space — two shared walls per space on average, which avoids counting a shared wall twice.',
    source: 'Rule of thumb used in early-stage GCC villa BOQs', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  opening_deduction_pct: {
    value: 15, unit: '%', label: 'Doors and windows deducted from wall area', group: 'walls', used: true,
    rationale: 'Typical doors plus windows as a share of gross wall area for a villa (10-20% range).',
    source: 'Common GCC estimating rule of thumb', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  ext_wall_thickness_mm: {
    value: 200, unit: 'mm', label: 'External wall thickness', group: 'walls', used: false,
    rationale: 'Same as block_ext_thickness.',
    source: 'Common GCC villa spec', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  int_wall_thickness_mm: {
    value: 150, unit: 'mm', label: 'Internal wall thickness', group: 'walls', used: false,
    rationale: 'Same as block_int_thickness.',
    source: 'Common GCC villa spec', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },

  /* --- Section 3: concrete --- */
  concrete_m3_per_m2_footings_tiebeams: {
    value: 0.06, unit: 'm3/m2', label: 'Concrete for footings and tie beams', group: 'concrete', used: true,
    rationale: 'Isolated pad footings plus a ground-beam allowance, ground floor only.',
    source: 'Rule-of-thumb GCC villa BOQ ratio', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  concrete_m3_per_m2_columns: {
    value: 0.025, unit: 'm3/m2 per floor', label: 'Concrete for columns', group: 'concrete', used: true,
    rationale: 'Typical column volume for a villa grid (4-5 m spans, 250x250 to 300x300 columns).',
    source: 'Rule-of-thumb GCC villa BOQ ratio', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  concrete_m3_per_m2_beams: {
    value: 0.045, unit: 'm3/m2 per floor', label: 'Concrete for beams', group: 'concrete', used: true,
    rationale: 'Typical tie and floor beam volume for villa spans.',
    source: 'Rule-of-thumb GCC villa BOQ ratio', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  slab_thickness_m: {
    value: 0.15, unit: 'm', label: 'Slab thickness', group: 'concrete', used: true,
    rationale: 'Standard villa solid slab thickness (125-150 mm range). This is the editable number; the concrete per m2 of slab is derived from it.',
    source: 'Common GCC villa structural spec', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  concrete_m3_per_m2_slab: {
    value: 0.15, unit: 'm3/m2 per floor', label: 'Concrete for floor and roof slabs', group: 'concrete', used: false,
    rationale: 'Derived, not separately editable: slab_thickness_m x 1 m2. Change the slab thickness instead and this follows it.',
    source: 'Direct geometry', sourceUrl: null,
    confidence: 'Certain', lastChecked: '2026-09-22'
  },
  concrete_m3_per_m2_ground_slab: {
    value: 0.10, unit: 'm3/m2', label: 'Concrete for the ground slab', group: 'concrete', used: true,
    rationale: 'Ground floor plinth and blinding slab, ground floor only.',
    source: 'Rule-of-thumb GCC villa BOQ ratio', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  concrete_wastage_pct: {
    value: 5, unit: '%', label: 'Concrete wastage', group: 'wastage', used: true,
    rationale: 'Spillage, over-excavation and formwork tolerance.',
    source: 'Common contractor allowance', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },

  /* --- Section 4: rebar steel --- */
  rebar_kg_per_m3_footings: {
    value: 80, unit: 'kg/m3', label: 'Steel in footings', group: 'steel', used: true,
    rationale: 'Mid-point of the typical 60-100 kg/m3 range for isolated footings.',
    source: 'General RC design rule of thumb (regional structural practice)', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  rebar_kg_per_m3_columns: {
    value: 150, unit: 'kg/m3', label: 'Steel in columns', group: 'steel', used: true,
    rationale: 'Mid-point of the typical 120-180 kg/m3 range for villa columns.',
    source: 'General RC design rule of thumb', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  rebar_kg_per_m3_beams: {
    value: 130, unit: 'kg/m3', label: 'Steel in beams', group: 'steel', used: true,
    rationale: 'Mid-point of the typical 100-160 kg/m3 range for beams.',
    source: 'General RC design rule of thumb', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  rebar_kg_per_m3_slabs: {
    value: 90, unit: 'kg/m3', label: 'Steel in slabs', group: 'steel', used: true,
    rationale: 'Mid-point of the typical 70-110 kg/m3 range for solid slabs.',
    source: 'General RC design rule of thumb', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  rebar_kg_per_m3_ground_slab: {
    value: 50, unit: 'kg/m3', label: 'Steel in the ground slab', group: 'steel', used: true,
    rationale: 'A ground-bearing slab carries a light mesh, not a suspended-slab cage; typical 40-60 kg/m3.',
    source: 'General RC practice for ground-bearing slabs', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  rebar_wastage_pct: {
    value: 5, unit: '%', label: 'Steel wastage', group: 'wastage', used: true,
    rationale: 'Offcuts and laps.',
    source: 'Common contractor allowance', sourceUrl: null,
    confidence: 'Likely', lastChecked: '2026-09-22'
  },

  /* --- Section 5: prices (starting points, not quotes) --- */
  price_omr_block_200: {
    value: 0.250, unit: 'OMR/pc', label: 'Price per 200 mm block', group: 'prices', used: true,
    rationale: 'No live listed price found; estimated from the typical GCC 200 mm hollow block range (about 0.200-0.300 OMR/pc).',
    source: 'Could not source a live price; industry-range estimate', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  price_omr_block_150: {
    value: 0.190, unit: 'OMR/pc', label: 'Price per 150 mm block', group: 'prices', used: true,
    rationale: 'Same as above; a 150 mm block is typically 20-25% cheaper than a 200 mm one.',
    source: 'Could not source a live price; industry-range estimate', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  price_omr_rebar_tonne: {
    value: 260, unit: 'OMR/tonne', label: 'Price per tonne of rebar steel', group: 'prices', used: true,
    rationale: 'Domestic Oman rebar reported at OMR 253-259 per tonne; delivered price runs higher for small orders.',
    source: 'Al Yusr International — Rebar Prices in Oman', sourceUrl: 'https://alyusroman.com/rebar-price-oman/',
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  price_omr_readymix_c30_m3: {
    value: 32, unit: 'OMR/m3', label: 'Price per m3 of C30 ready-mix concrete', group: 'prices', used: true,
    rationale: 'No Oman figure could be sourced; estimated from the typical GCC C30 ready-mix range (28-38 OMR/m3).',
    source: 'Could not source a live Oman price; industry-range estimate', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  price_omr_cement_bag_50kg: {
    value: 1.900, unit: 'OMR/bag', label: 'Price per 50 kg cement bag', group: 'prices', used: false,
    rationale: 'Recent Oman buyer target range of 1.8-2.0 OMR per 50 kg bag. Shown for reference; mortar is not counted in v1.',
    source: 'go4WorldBusiness — Cement Bags Buyers, Oman', sourceUrl: 'https://www.go4worldbusiness.com/buyers/worldwide/cement-bags.html',
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  price_omr_sand_m3: {
    value: 6, unit: 'OMR/m3', label: 'Price per m3 of sand', group: 'prices', used: false,
    rationale: 'Not sourced for Oman specifically; typical GCC building-sand price. Shown for reference; mortar is not counted in v1.',
    source: 'Could not source a live price; industry-range estimate', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },
  price_omr_aggregate_m3: {
    value: 7, unit: 'OMR/m3', label: 'Price per m3 of aggregate', group: 'prices', used: false,
    rationale: 'Not sourced for Oman specifically; typical GCC coarse-aggregate price. Shown for reference; ready-mix already includes aggregate.',
    source: 'Could not source a live price; industry-range estimate', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  },

  /* --- Section 7: orchestrator amendments (these override section 6's headline numbers) --- */
  ext_perimeter_shape_factor: {
    value: 1.15, unit: '-', label: 'Building shape factor for external wall length', group: 'walls', used: true,
    rationale: 'External wall length = factor x 4 x square root of floor area. 1.0 is a perfect square, about 1.02 a 1.5:1 rectangle, 1.2-1.3 an L-shaped villa.',
    source: 'Geometry; the villa-shape allowance is a rule of thumb', sourceUrl: null,
    confidence: 'Guessing', lastChecked: '2026-09-22'
  }
};

/* Assumptions that are words, not numbers — nothing to edit, but they still have to be visible
 * and traceable. construction_system comes from the "Construction system chosen" heading of
 * docs/research/assumptions.md; the other two are table rows. */
export const ASSUMPTION_NOTES = [
  {
    key: 'construction_system',
    value: 'Reinforced-concrete frame (footings, columns, beams, solid slabs) with concrete block infill walls',
    rationale: 'Confirmed as the dominant system for villas in Muscat and the wider GCC self-build market. Load-bearing masonry and precast were both rejected as rarer for private villas.',
    source: 'Regional RC design guides, local contractors and block factories',
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  {
    key: 'concrete_grade_structural',
    value: 'C30',
    rationale: 'Typical GCC villa structural grade for footings, tie beams, columns, beams and slabs. Lean/blinding concrete is folded into the footing allowance rather than counted separately.',
    source: 'Common regional RC practice (ACI/BS-aligned)',
    confidence: 'Likely', lastChecked: '2026-09-22'
  },
  {
    key: 'rooms_are_all_spaces',
    value: 'true',
    rationale: 'The room list must include EVERY space on a floor — majlis, living, kitchen, bedrooms, bathrooms, corridors. Floor area is the sum of the space areas, so walls exist around every space, not only around "rooms".',
    source: 'Quantity take-off practice',
    confidence: 'Certain', lastChecked: '2026-09-22'
  }
];

/* Sane bounds for anything the user types (docs/CONVENTIONS.md, input safety). */
export const LIMITS = {
  floors: [1, 4],
  wallHeightM: [2.4, 4.5],
  roomSideM: [1, 20],
  rooms: [1, 40],
  areaM2: [30, 1500]
};

/* A worked example: every space on one floor of a typical two-storey Muscat villa.
 * Per rooms_are_all_spaces, this list is ALL the spaces on the floor, so the areas sum to the
 * whole floor area (about 200 m2) — corridor and staircase included. */
export const SAMPLE_HOUSE = {
  floors: 2,
  wallHeightM: 3.0,
  rooms: [
    { name: 'Majlis (guest sitting)', lengthM: 6.8, widthM: 5.0 },
    { name: 'Guest WC', lengthM: 2.0, widthM: 1.5 },
    { name: 'Living / family room', lengthM: 6.0, widthM: 4.5 },
    { name: 'Dining', lengthM: 4.5, widthM: 3.5 },
    { name: 'Kitchen', lengthM: 4.5, widthM: 3.5 },
    { name: 'Store', lengthM: 2.5, widthM: 2.0 },
    { name: 'Laundry', lengthM: 2.5, widthM: 2.0 },
    { name: 'Master bedroom', lengthM: 5.0, widthM: 4.5 },
    { name: 'Master bathroom', lengthM: 2.8, widthM: 2.5 },
    { name: 'Bedroom 2', lengthM: 4.5, widthM: 4.0 },
    { name: 'Bedroom 3', lengthM: 4.5, widthM: 4.0 },
    { name: 'Family bathroom', lengthM: 2.5, widthM: 2.2 },
    { name: 'Hall / corridor', lengthM: 14.0, widthM: 1.4 },
    { name: 'Staircase', lengthM: 4.0, widthM: 2.2 }
  ]
};

/* The space mix used by the m2 shortcut: share of the floor and shape (length / width) of each
 * space, taken straight from SAMPLE_HOUSE so both input routes describe the same kind of house
 * (rooms_are_all_spaces). Small houses drop the spaces a small house would not have. */
const ROOM_MIX_STANDARD = [
  { name: 'Majlis (guest sitting)', share: 0.1659, ratio: 1.36 },
  { name: 'Guest WC', share: 0.0146, ratio: 1.33 },
  { name: 'Living / family room', share: 0.1318, ratio: 1.33 },
  { name: 'Dining', share: 0.0769, ratio: 1.29 },
  { name: 'Kitchen', share: 0.0769, ratio: 1.29 },
  { name: 'Store', share: 0.0244, ratio: 1.25 },
  { name: 'Laundry', share: 0.0244, ratio: 1.25 },
  { name: 'Master bedroom', share: 0.1098, ratio: 1.11 },
  { name: 'Master bathroom', share: 0.0342, ratio: 1.12 },
  { name: 'Bedroom 2', share: 0.0879, ratio: 1.13 },
  { name: 'Bedroom 3', share: 0.0879, ratio: 1.13 },
  { name: 'Family bathroom', share: 0.0268, ratio: 1.14 },
  { name: 'Hall / corridor', share: 0.0957, ratio: 10.00 },
  { name: 'Staircase', share: 0.0429, ratio: 1.82 }
];

const ROOM_MIX_SMALL = [
  { name: 'Living / majlis', share: 0.2400, ratio: 1.35 },
  { name: 'Kitchen', share: 0.1200, ratio: 1.30 },
  { name: 'Master bedroom', share: 0.2000, ratio: 1.15 },
  { name: 'Bedroom 2', share: 0.1600, ratio: 1.15 },
  { name: 'Bathroom', share: 0.0900, ratio: 1.15 },
  { name: 'Store', share: 0.0600, ratio: 1.25 },
  { name: 'Hall / corridor', share: 0.1300, ratio: 5.00 }
];

function isFiniteNumber(n) {
  return typeof n === 'number' && isFinite(n);
}

function round(n, places) {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

function clamp(n, lo, hi) {
  return n < lo ? lo : (n > hi ? hi : n);
}

function inRange(n, range) {
  return n >= range[0] && n <= range[1];
}

/* Checks a house description and returns a cleaned copy. Throws a plain-English Error naming the
 * field and its allowed range — the page shows this message as-is, so it never shows NaN. */
export function validateHouse(house) {
  if (!house || typeof house !== 'object' || Array.isArray(house)) {
    throw new Error('Please describe the house first: number of floors, wall height and a list of rooms.');
  }
  if (!isFiniteNumber(house.floors) || !Number.isInteger(house.floors) || !inRange(house.floors, LIMITS.floors)) {
    throw new Error('Number of floors should be a whole number between ' + LIMITS.floors[0] + ' and ' + LIMITS.floors[1] + '.');
  }
  if (!isFiniteNumber(house.wallHeightM) || !inRange(house.wallHeightM, LIMITS.wallHeightM)) {
    throw new Error('Wall height should be between ' + LIMITS.wallHeightM[0] + ' and ' + LIMITS.wallHeightM[1] + ' m.');
  }
  if (!Array.isArray(house.rooms) || house.rooms.length < LIMITS.rooms[0]) {
    throw new Error('Add at least one room — the room list should cover every space on the floor.');
  }
  if (house.rooms.length > LIMITS.rooms[1]) {
    throw new Error('That is a lot of rooms — please keep the room list to ' + LIMITS.rooms[1] + ' spaces or fewer.');
  }
  const rooms = house.rooms.map(function (room, i) {
    const position = i + 1;
    if (!room || typeof room !== 'object' || Array.isArray(room)) {
      throw new Error('Room ' + position + ' is missing its size. Give it a length and a width in metres.');
    }
    /* A blank name is not an error — we name it for the user instead of stopping them. */
    let name = typeof room.name === 'string' ? room.name.trim() : '';
    if (name === '') name = 'Room ' + position;
    if (!isFiniteNumber(room.lengthM) || !inRange(room.lengthM, LIMITS.roomSideM)) {
      throw new Error('Length of "' + name + '" should be between ' + LIMITS.roomSideM[0] + ' and ' + LIMITS.roomSideM[1] + ' m.');
    }
    if (!isFiniteNumber(room.widthM) || !inRange(room.widthM, LIMITS.roomSideM)) {
      throw new Error('Width of "' + name + '" should be between ' + LIMITS.roomSideM[0] + ' and ' + LIMITS.roomSideM[1] + ' m.');
    }
    return { name: name, lengthM: room.lengthM, widthM: room.widthM };
  });
  const floorAreaM2 = rooms.reduce(function (sum, r) { return sum + r.lengthM * r.widthM; }, 0);
  if (!inRange(floorAreaM2, LIMITS.areaM2)) {
    throw new Error('Floor area adds up to ' + round(floorAreaM2, 1) + ' m2. It should be between ' + LIMITS.areaM2[0] + ' and ' + LIMITS.areaM2[1] + ' m2 per floor.');
  }
  return { floors: house.floors, wallHeightM: house.wallHeightM, rooms: rooms };
}

/* The m2 shortcut: turn "my floor is about N m2" into a full, plausible list of spaces whose areas
 * add up to N (within 2%). Deterministic — the same number in always gives the same list out.
 * Uses rooms_are_all_spaces: the generated list covers the WHOLE floor, corridor included. */
export function generateRooms(areaM2) {
  if (!isFiniteNumber(areaM2) || !inRange(areaM2, LIMITS.areaM2)) {
    throw new Error('Approximate floor size should be a number between ' + LIMITS.areaM2[0] + ' and ' + LIMITS.areaM2[1] + ' m2 per floor.');
  }
  const mix = areaM2 < 90 ? ROOM_MIX_SMALL : ROOM_MIX_STANDARD;
  const shareTotal = mix.reduce(function (s, m) { return s + m.share; }, 0);
  const rooms = mix.map(function (m) {
    const target = areaM2 * (m.share / shareTotal);
    let width = Math.sqrt(target / m.ratio);
    let length = width * m.ratio;
    /* Keep every generated room inside the same bounds validateHouse() enforces. */
    length = clamp(round(length, 1), LIMITS.roomSideM[0], LIMITS.roomSideM[1]);
    width = clamp(round(width, 1), LIMITS.roomSideM[0], LIMITS.roomSideM[1]);
    return { name: m.name, lengthM: length, widthM: width };
  });
  const area = function () {
    return rooms.reduce(function (s, r) { return s + r.lengthM * r.widthM; }, 0);
  };
  /* Close the gap left by rounding and clamping: nudge room lengths by 0.1 m at a time, largest
   * room first, until the total is within 0.5% of the target. Bounded, so it always terminates. */
  for (let pass = 0; pass < 400; pass++) {
    const diff = areaM2 - area();
    if (Math.abs(diff) <= areaM2 * 0.005) break;
    const order = rooms.map(function (r, i) { return i; }).sort(function (a, b) {
      return (rooms[b].lengthM * rooms[b].widthM) - (rooms[a].lengthM * rooms[a].widthM);
    });
    let moved = false;
    for (let j = 0; j < order.length; j++) {
      const r = rooms[order[j]];
      const step = diff > 0 ? 0.1 : -0.1;
      const next = round(r.lengthM + step, 1);
      if (next >= LIMITS.roomSideM[0] && next <= LIMITS.roomSideM[1]) {
        r.lengthM = next;
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
  return rooms;
}

function resolveValues(overrides) {
  const values = {};
  for (const key in DEFAULTS) values[key] = DEFAULTS[key].value;
  if (overrides === null || overrides === undefined) return values;
  if (typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new Error('Your edited assumptions could not be read. Please reload the page and try again.');
  }
  for (const key in overrides) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
      throw new Error('"' + key + '" is not one of the assumptions this calculator uses.');
    }
    const v = overrides[key];
    if (!isFiniteNumber(v)) {
      throw new Error('Your value for "' + DEFAULTS[key].label + '" should be a number.');
    }
    if (v < 0) {
      throw new Error('Your value for "' + DEFAULTS[key].label + '" cannot be negative.');
    }
    if (!DEFAULTS[key].used) {
      /* Golden rule, second half: anything the user can edit must actually change the answer.
       * Reference-only rows (block sizes, wall thicknesses, mortar materials, the superseded
       * perimeter factor, the derived slab volume) are shown read-only, so an override of one
       * would be silently ignored — we refuse it instead. */
      throw new Error('"' + DEFAULTS[key].label + '" is reference only and is not used in the v1 calculation, so it cannot be changed.');
    }
    values[key] = v;
  }
  return values;
}

/* Derived values follow the row they come from rather than being edited on their own. */
function applyDerived(values) {
  /* concrete_m3_per_m2_slab = slab_thickness_m x 1 m2 */
  values.concrete_m3_per_m2_slab = values.slab_thickness_m * 1;
  return values;
}

/* The estimate. Every formula below names the assumption keys it uses — that naming IS the
 * traceability promise in docs/CONVENTIONS.md. */
export function estimate(house, overrides) {
  const h = validateHouse(house);
  const a = applyDerived(resolveValues(overrides));
  const wastedBlocks = 1 + a.block_wastage_pct / 100;     /* block_wastage_pct */
  const wastedConcrete = 1 + a.concrete_wastage_pct / 100; /* concrete_wastage_pct */
  const wastedSteel = 1 + a.rebar_wastage_pct / 100;       /* rebar_wastage_pct */

  /* Geometry. floorAreaM2 = sum of all space areas (rooms_are_all_spaces);
   * builtUpAreaM2 = floorAreaM2 x floors (the same layout repeats on every floor). */
  const floorAreaM2 = h.rooms.reduce(function (s, r) { return s + r.lengthM * r.widthM; }, 0);
  const builtUpAreaM2 = floorAreaM2 * h.floors;

  /* extWallLengthM = ext_perimeter_shape_factor x 4 x sqrt(floorAreaM2)   [section 7] */
  const extWallLengthM = a.ext_perimeter_shape_factor * 4 * Math.sqrt(floorAreaM2);
  /* intWallLengthM = int_wall_per_room_factor x sum(length + width) over every space */
  const perimeterSum = h.rooms.reduce(function (s, r) { return s + r.lengthM + r.widthM; }, 0);
  const intWallLengthM = a.int_wall_per_room_factor * perimeterSum;

  /* Wall areas = length x wallHeightM x floors, less opening_deduction_pct for doors and windows. */
  const openingFactor = 1 - a.opening_deduction_pct / 100;
  const grossExt = extWallLengthM * h.wallHeightM * h.floors;
  const grossInt = intWallLengthM * h.wallHeightM * h.floors;
  const grossWallAreaM2 = grossExt + grossInt;
  const extWallAreaM2 = grossExt * openingFactor;
  const intWallAreaM2 = grossInt * openingFactor;
  const netWallAreaM2 = extWallAreaM2 + intWallAreaM2;

  /* Blocks = net wall area x blocks_per_m2_wall x block wastage, rounded up to whole blocks. */
  const blocksExternal = Math.ceil(extWallAreaM2 * a.blocks_per_m2_wall * wastedBlocks);
  const blocksInternal = Math.ceil(intWallAreaM2 * a.blocks_per_m2_wall * wastedBlocks);

  /* Concrete. Footings and the ground slab are ground-floor only, so they use floorAreaM2 once;
   * columns, beams and slabs repeat on every floor, so they use builtUpAreaM2.
   * Keys: concrete_m3_per_m2_footings_tiebeams, concrete_m3_per_m2_ground_slab,
   *       concrete_m3_per_m2_columns, concrete_m3_per_m2_beams,
   *       concrete_m3_per_m2_slab (derived from slab_thickness_m). */
  const rawFootings = floorAreaM2 * a.concrete_m3_per_m2_footings_tiebeams;
  const rawGroundSlab = floorAreaM2 * a.concrete_m3_per_m2_ground_slab;
  const rawColumns = builtUpAreaM2 * a.concrete_m3_per_m2_columns;
  const rawBeams = builtUpAreaM2 * a.concrete_m3_per_m2_beams;
  const rawSlabs = builtUpAreaM2 * a.concrete_m3_per_m2_slab;

  /* Steel = element concrete BEFORE wastage x that element's rebar_kg_per_m3 x rebar wastage.
   * The ground slab has its own rate, rebar_kg_per_m3_ground_slab (assumptions.md section 7): a
   * ground-bearing slab carries a light mesh, not a suspended-slab cage, so it is reinforced, but
   * far more lightly than the floor and roof slabs. */
  const steel = function (m3, kgPerM3) { return m3 * kgPerM3 * wastedSteel; };

  const rows = {
    footings: {
      label: 'Footings & tie beams',
      concreteM3: round(rawFootings * wastedConcrete, 2),
      steelKg: round(steel(rawFootings, a.rebar_kg_per_m3_footings), 1),
      blocks: 0,
      wastagePct: a.concrete_wastage_pct
    },
    groundSlab: {
      label: 'Ground slab',
      concreteM3: round(rawGroundSlab * wastedConcrete, 2),
      steelKg: round(steel(rawGroundSlab, a.rebar_kg_per_m3_ground_slab), 1),
      blocks: 0,
      wastagePct: a.concrete_wastage_pct
    },
    columns: {
      label: 'Columns',
      concreteM3: round(rawColumns * wastedConcrete, 2),
      steelKg: round(steel(rawColumns, a.rebar_kg_per_m3_columns), 1),
      blocks: 0,
      wastagePct: a.concrete_wastage_pct
    },
    beams: {
      label: 'Beams',
      concreteM3: round(rawBeams * wastedConcrete, 2),
      steelKg: round(steel(rawBeams, a.rebar_kg_per_m3_beams), 1),
      blocks: 0,
      wastagePct: a.concrete_wastage_pct
    },
    slabs: {
      label: 'Floor & roof slabs',
      concreteM3: round(rawSlabs * wastedConcrete, 2),
      steelKg: round(steel(rawSlabs, a.rebar_kg_per_m3_slabs), 1),
      blocks: 0,
      wastagePct: a.concrete_wastage_pct
    },
    wallsExternal: {
      label: 'External walls (200 mm block)',
      concreteM3: 0,
      steelKg: 0,
      blocks: blocksExternal,
      wastagePct: a.block_wastage_pct
    },
    wallsInternal: {
      label: 'Internal walls (150 mm block)',
      concreteM3: 0,
      steelKg: 0,
      blocks: blocksInternal,
      wastagePct: a.block_wastage_pct
    }
  };

  /* Costs. External blocks at price_omr_block_200, internal at price_omr_block_150,
   * concrete at price_omr_readymix_c30_m3, steel at price_omr_rebar_tonne. */
  rows.wallsExternal.costOmr = round(blocksExternal * a.price_omr_block_200, 2);
  rows.wallsInternal.costOmr = round(blocksInternal * a.price_omr_block_150, 2);
  const concreteRows = ['footings', 'groundSlab', 'columns', 'beams', 'slabs'];
  let totalConcreteM3 = 0;
  let totalSteelKg = 0;
  concreteRows.forEach(function (key) {
    const row = rows[key];
    totalConcreteM3 += row.concreteM3;
    totalSteelKg += row.steelKg;
    row.costOmr = round(
      row.concreteM3 * a.price_omr_readymix_c30_m3 + (row.steelKg / 1000) * a.price_omr_rebar_tonne,
      2
    );
  });
  totalConcreteM3 = round(totalConcreteM3, 2);
  totalSteelKg = round(totalSteelKg, 1);

  const costBlocksOmr = round(rows.wallsExternal.costOmr + rows.wallsInternal.costOmr, 2);
  const costConcreteOmr = round(totalConcreteM3 * a.price_omr_readymix_c30_m3, 2);
  const costSteelOmr = round((totalSteelKg / 1000) * a.price_omr_rebar_tonne, 2);

  const assumptionsUsed = [];
  for (const key in DEFAULTS) {
    const d = DEFAULTS[key];
    assumptionsUsed.push({
      key: key,
      label: d.label,
      value: a[key],
      unit: d.unit,
      defaultValue: d.value,
      used: d.used,
      overridden: d.used && a[key] !== d.value,
      source: d.source,
      sourceUrl: d.sourceUrl,
      confidence: d.confidence,
      lastChecked: d.lastChecked
    });
  }

  const guessing = assumptionsUsed
    .filter(function (x) { return x.confidence === 'Guessing' && DEFAULTS[x.key].group === 'prices'; })
    .map(function (x) { return x.label.toLowerCase(); });

  const notes = [
    'These are starting-point prices, not quotes — check with your supplier before you order.',
    'Quantities already include wastage: ' + a.block_wastage_pct + '% on blocks, ' + a.concrete_wastage_pct + '% on concrete and ' + a.rebar_wastage_pct + '% on steel.',
    'This covers blocks, ready-mix concrete and rebar steel only. It excludes mortar (sand and cement), plaster, tiles, paint, doors and windows, electrics and plumbing, and all labour.',
    'Least reliable prices (marked "Guessing" in the assumptions): ' + guessing.join(', ') + '.',
    'Every space on the floor must be in the room list — corridors and stairs included — because the floor area is the sum of the spaces you list, and the same layout is repeated on every floor.'
  ];

  return {
    inputs: {
      floors: h.floors,
      wallHeightM: h.wallHeightM,
      roomCount: h.rooms.length,
      floorAreaM2: round(floorAreaM2, 2),
      builtUpAreaM2: round(builtUpAreaM2, 2),
      extWallLengthM: round(extWallLengthM, 2),
      intWallLengthM: round(intWallLengthM, 2),
      grossWallAreaM2: round(grossWallAreaM2, 2),
      netWallAreaM2: round(netWallAreaM2, 2),
      extWallAreaM2: round(extWallAreaM2, 2),
      intWallAreaM2: round(intWallAreaM2, 2)
    },
    elements: rows,
    totals: {
      blocks: blocksExternal + blocksInternal,
      blocksExternal: blocksExternal,
      blocksInternal: blocksInternal,
      concreteM3: totalConcreteM3,
      steelKg: totalSteelKg,
      steelTonnes: round(totalSteelKg / 1000, 3),
      costOmr: round(costBlocksOmr + costConcreteOmr + costSteelOmr, 2),
      costBlocksOmr: costBlocksOmr,
      costConcreteOmr: costConcreteOmr,
      costSteelOmr: costSteelOmr
    },
    assumptionsUsed: assumptionsUsed,
    notes: notes
  };
}
