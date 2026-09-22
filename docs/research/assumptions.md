# Construction defaults — Oman/GCC self-builder house estimator

All numbers below feed `src/calc.js`'s `DEFAULTS` object. Every key is snake_case and maps
1:1 to a default the UI lets the user overwrite. **Prices are editable defaults, never
authoritative** — they are rough market snapshots checked on 2026-09-22, not quotes, and a
real quantity surveyor or supplier quote should always win.

## Construction system chosen

**Reinforced-concrete (RC) skeleton frame — isolated footings + tie beams, columns, beams,
solid slabs — with hollow concrete block (CMU) infill/partition walls.** This is confirmed
(not just assumed) as the dominant system for villas in Muscat and across GCC self-build:
block infill on an RC frame is faster and cheaper than load-bearing block, and is what local
contractors, block factories (e.g. Al Madina Cement Products) and RC design guides for the
region assume by default. Load-bearing masonry and precast are both rarer for private villas
here and were rejected.

## 1. Block sizes and counts

| key | value | unit | rationale | source | confidence | last_checked |
|---|---|---|---|---|---|---|
| block_ext_length | 400 | mm | standard GCC hollow block face size (400×200×h) | Al Madina Cement Products (mcp.om) product range | Likely | 2026-09-22 |
| block_ext_height | 200 | mm | standard block face height | Al Madina Cement Products (mcp.om) | Likely | 2026-09-22 |
| block_ext_thickness | 200 | mm | typical external wall block, load path + insulation mass | Common GCC villa spec (Muscat Municipality practice) | Likely | 2026-09-22 |
| block_int_thickness | 150 | mm | typical internal partition block, non-load-bearing | Common GCC villa spec | Likely | 2026-09-22 |
| mortar_joint_mm | 10 | mm | standard bed/head joint | General masonry practice (BS 5628 / regional norm) | Likely | 2026-09-22 |
| blocks_per_m2_wall | 12.5 | pcs/m² | (0.4+0.01)×(0.2+0.01) ≈ 0.0861 m² per block incl. joint → 1/0.0861 ≈ 11.6, rounded up to industry rule-of-thumb 12.5/m² to cover cutting | Standard block-count rule of thumb used by GCC estimators | Likely | 2026-09-22 |
| block_wastage_pct | 5 | % | breakage, cutting at corners/openings | Common contractor allowance | Likely | 2026-09-22 |

## 2. Wall geometry rules of thumb

| key | value | unit | rationale | source | confidence | last_checked |
|---|---|---|---|---|---|---|
| wall_height_default_m | 3.0 | m | typical Muscat villa floor-to-floor/ceiling height | Common GCC villa spec | Likely | 2026-09-22 |
| ext_wall_perimeter_factor | 1.0 | — | external wall length = building perimeter, derived from the outermost room footprint per floor (sum of room L/W forming the envelope) | Standard quantity-take-off method | Likely | 2026-09-22 |
| int_wall_per_room_factor | 0.5 | — | internal wall length ≈ 0.5 × (room L + W) per room, i.e. two shared walls per room on average (avoids double counting shared walls) | Rule of thumb used in early-stage GCC villa BOQs | Guessing | 2026-09-22 |
| opening_deduction_pct | 15 | % | typical doors+windows as % of gross wall area for a villa | Common GCC estimating rule of thumb (10–20% range) | Guessing | 2026-09-22 |
| ext_wall_thickness_mm | 200 | mm | see block_ext_thickness | — | Likely | 2026-09-22 |
| int_wall_thickness_mm | 150 | mm | see block_int_thickness | — | Likely | 2026-09-22 |

## 3. Concrete volumes (per m² of built-up area, per floor, unless noted)

Grade default: **C30** for structural elements (footings, tie beams, columns, beams, slabs),
**C15/C20 lean/blinding** not separately counted (folded into footing wastage).

| key | value | unit | rationale | source | confidence | last_checked |
|---|---|---|---|---|---|---|
| concrete_grade_structural | C30 | grade | typical GCC villa structural grade | Common regional RC practice (ACI/BS-aligned) | Likely | 2026-09-22 |
| concrete_m3_per_m2_footings_tiebeams | 0.06 | m³/m² | isolated pad footings + ground-beam allowance, ground floor only | Rule-of-thumb GCC villa BOQ ratio | Guessing | 2026-09-22 |
| concrete_m3_per_m2_columns | 0.025 | m³/m² per floor | typical column volume for villa grid (~4–5 m spans, 250×250–300×300 columns) | Rule-of-thumb GCC villa BOQ ratio | Guessing | 2026-09-22 |
| concrete_m3_per_m2_beams | 0.045 | m³/m² per floor | typical tie/floor beam volume for villa spans | Rule-of-thumb GCC villa BOQ ratio | Guessing | 2026-09-22 |
| slab_thickness_m | 0.15 | m | standard villa solid slab thickness | Common GCC villa structural spec (125–150mm range) | Likely | 2026-09-22 |
| concrete_m3_per_m2_slab | 0.15 | m³/m² per floor | = slab_thickness_m × 1 m² | Direct geometry | Certain | 2026-09-22 |
| concrete_m3_per_m2_ground_slab | 0.10 | m³/m² | ground floor plinth/blinding slab, ground floor only | Rule-of-thumb GCC villa BOQ ratio | Guessing | 2026-09-22 |
| concrete_wastage_pct | 5 | % | spillage, over-excavation, formwork tolerance | Common contractor allowance | Likely | 2026-09-22 |

## 4. Rebar steel (kg per m³ of concrete, by element)

| key | value | unit | rationale | source | confidence | last_checked |
|---|---|---|---|---|---|---|
| rebar_kg_per_m3_footings | 80 | kg/m³ | mid-point of typical 60–100 kg/m³ range for isolated footings | General RC design rule of thumb (regional structural practice) | Likely | 2026-09-22 |
| rebar_kg_per_m3_columns | 150 | kg/m³ | mid-point of typical 120–180 kg/m³ range for villa columns | General RC design rule of thumb | Likely | 2026-09-22 |
| rebar_kg_per_m3_beams | 130 | kg/m³ | mid-point of typical 100–160 kg/m³ range for beams | General RC design rule of thumb | Likely | 2026-09-22 |
| rebar_kg_per_m3_slabs | 90 | kg/m³ | mid-point of typical 70–110 kg/m³ range for solid slabs | General RC design rule of thumb | Likely | 2026-09-22 |
| rebar_wastage_pct | 5 | % | offcuts, laps | Common contractor allowance | Likely | 2026-09-22 |

## 5. Prices in OMR (as of 2026-09-22)

**These prices are rough market snapshots, not quotes — always editable in the UI, never
authoritative.**

| key | value | unit | rationale | source | confidence | last_checked |
|---|---|---|---|---|---|---|
| price_omr_block_200 | 0.250 | OMR/pc | no single current listed price found; estimated from typical GCC 200mm hollow block range (~0.200–0.300 OMR/pc) | Could not source a live price; industry-range estimate | Guessing | 2026-09-22 |
| price_omr_block_150 | 0.190 | OMR/pc | same — 150mm block typically ~20–25% cheaper than 200mm | Could not source a live price; industry-range estimate | Guessing | 2026-09-22 |
| price_omr_rebar_tonne | 260 | OMR/tonne | domestic Oman rebar reported at OMR 253–259/tonne (delivered price will run higher for small orders) | [Al Yusr International — Rebar Prices in Oman](https://alyusroman.com/rebar-price-oman/) (search-snippet only, page itself blocked from direct fetch) | Likely | 2026-09-22 |
| price_omr_readymix_c30_m3 | 32 | OMR/m³ | no OMR/m³ figure could be sourced for Oman; estimated from typical GCC C30 ready-mix range (28–38 OMR/m³) | Could not source a live Oman price; industry-range estimate | Guessing | 2026-09-22 |
| price_omr_cement_bag_50kg | 1.900 | OMR/bag | recent Oman buyer target range 1.8–2.0 OMR/50kg bag (older Raysut list prices from 2008–09 are stale and excluded) | [go4WorldBusiness — Cement Bags Buyers, Oman](https://www.go4worldbusiness.com/buyers/worldwide/cement-bags.html) | Guessing | 2026-09-22 |
| price_omr_sand_m3 | 6 | OMR/m³ | not sourced for Oman specifically; typical GCC building-sand price | Could not source a live price; industry-range estimate | Guessing | 2026-09-22 |
| price_omr_aggregate_m3 | 7 | OMR/m³ | not sourced for Oman specifically; typical GCC coarse-aggregate price | Could not source a live price; industry-range estimate | Guessing | 2026-09-22 |

**Not sourced properly (all marked Guessing above):** 200mm and 150mm block unit prices,
ready-mix C30 price per m³, sand and aggregate prices. Supplier websites for these
(mcp.om, buymaterials.com) were unreachable from this environment (network egress blocked);
a follow-up pass with direct supplier contact or a browsing-enabled pass should replace these
with sourced figures before the UI ships numbers the owner will quote to a builder.

## 6. Worked example — 2-floor, 5-room, ~200 m²/floor villa (400 m² total)

Assumptions: 5 rooms per floor averaging 4m × 5m (20 m² each = 100 m² of room footprint;
remaining ~100 m²/floor is circulation, allowed for inside the perimeter envelope), external
wall height 3.0 m per floor, 2 floors.

| step | calculation | result |
|---|---|---|
| External wall length (per floor) | ≈ perimeter of a ~14m × 14.3m envelope (200 m²) | ≈ 57 m |
| Internal wall length (per floor) | 0.5 × (4+5) × 5 rooms | ≈ 22.5 m |
| Gross wall area (2 floors) | (57+22.5) × 3.0 m × 2 floors | ≈ 477 m² |
| Net wall area after openings | 477 × (1 − 0.15) | ≈ 405 m² |
| **Block count** | 405 m² × 12.5 blocks/m² × 1.05 wastage | **≈ 5,320 blocks** |
| Concrete: footings+tiebeams (GF only) | 200 m² × 0.06 | 12.0 m³ |
| Concrete: columns (2 floors) | 400 m² × 0.025 | 10.0 m³ |
| Concrete: beams (2 floors) | 400 m² × 0.045 | 18.0 m³ |
| Concrete: slabs (2 floors) | 400 m² × 0.15 | 60.0 m³ |
| Concrete: ground slab (GF only) | 200 m² × 0.10 | 20.0 m³ |
| Concrete subtotal × 1.05 wastage | (12+10+18+60+20) × 1.05 | **≈ 126 m³** |
| **Steel (weighted avg ≈ 108 kg/m³) × 1.05 wastage** | 126 m³ × ~108 kg/m³ × 1.05 (roughly) | **≈ 13.6 tonnes** |
| **Cost — blocks** | 5,320 × 0.250 OMR (using 200mm price for all, conservative) | ≈ 1,330 OMR |
| **Cost — concrete** | 126 × 32 OMR | ≈ 4,032 OMR |
| **Cost — steel** | 13.6 × 260 OMR | ≈ 3,536 OMR |
| **Total materials (blocks+concrete+steel only)** | sum | **≈ 8,900 OMR** |

**Six headline numbers:** ≈5,320 blocks · ≈126 m³ concrete · ≈13.6 tonnes steel ·
≈1,330 OMR blocks · ≈4,032 OMR concrete · ≈3,536 OMR steel (≈8,900 OMR materials total,
excludes mortar sand/cement/aggregate, labour, finishes, MEP).

## 7. Orchestrator amendments (main session, 2026-09-22)

Reviewing section 6: the block count is low because the five sample rooms cover only 100 m² of
the 200 m² floor, so half the floor has no walls at all. Two amendments keep both input routes
consistent and traceable:

| key | value | unit | rationale | source | confidence | last_checked |
|---|---|---|---|---|---|---|
| rooms_are_all_spaces | true | rule | the room list must include EVERY space on a floor (majlis, living, kitchen, bedrooms, bathrooms, corridors/hall); floor area = sum of room areas, so the m² shortcut must generate spaces that sum to the entered m² | Quantity take-off practice — walls exist around every space, not only "rooms" | Certain | 2026-09-22 |
| rebar_kg_per_m3_ground_slab | 50 | kg/m³ | ground-bearing slab carries a light mesh, not a suspended-slab cage; typical 40–60 kg/m³ | General RC practice for ground-bearing slabs (code-review finding, 2026-09-22) | Guessing | 2026-09-22 |
| ext_perimeter_shape_factor | 1.15 | — | external wall length = factor × 4 × √(floor area); 1.0 is a square, ~1.02 a 1.5:1 rectangle, L-shaped villas 1.2–1.3 | Geometry; villa-shape allowance is a rule of thumb | Guessing | 2026-09-22 |

`int_wall_per_room_factor` (0.5 × (L+W) per space) stays, now applied over all spaces.
Section 6's headline numbers are therefore superseded by the calculator's own sample house
(all spaces listed); the test suite pins that sample and checks it lands in sane ranges
(roughly 7,000–13,000 blocks, 110–140 m³ concrete, 10–16 t steel for a 400 m² villa — a
"Guessing"-grade sanity band; the exact golden snapshot in the tests is what catches formula drift).

**Used vs reference-only.** Only some rows drive v1 maths. Rows that are documentation of the
system (block dimensions, mortar joint, wall thicknesses, default wall height, the superseded
`ext_wall_perimeter_factor`, and the cement/sand/aggregate prices since mortar is out of scope)
are carried for traceability and must be shown read-only, marked "reference only — not used in
v1", never as editable overrides. `concrete_m3_per_m2_slab` is derived from `slab_thickness_m`
(Certain, geometry) and is not separately editable.
