# Estimator — screen spec

Source of truth order: `docs/CONVENTIONS.md` (law) → `docs/specs/estimator.md` (approved
product spec, all three open-question defaults accepted) → this file (screen-level detail).
One page, `src/page.html` → built into `index.html`. Plain HTML + CSS + vanilla JS — no
framework, no build-time UI library, nothing to `npm install`.

**Language:** English only. Arabic/RTL is explicitly out of scope for this app (per
`docs/specs/estimator.md`) — every string below is the only string; there is no second
language file to keep in sync.

No existing screens exist in this repo yet, so instead of "reuse this component" the four
patterns below are the full component vocabulary. The builder implements each once (as a CSS
class + a tiny JS helper if needed) and reuses it everywhere it appears.

---

## Reusable patterns

**1. Card** — a rounded container, `var(--radius)`, `var(--space-4)` padding, `var(--shadow-1)`,
background `var(--surface)`. Every major block (inputs, assumptions panel, results headline,
breakdown table, each timeline entry) sits in a card. Cards stack with `var(--space-5)` gap,
full width on phone, max-width `var(--content-max)` centered on desktop.

**2. Number input with unit suffix** — a labelled input where the unit (m, m², %, OMR, kg) is
shown as a fixed suffix inside or directly beside the field, never inferred. Layout: label above
(or beside, on desktop, in a two-column grid), input, unit suffix. Min/max/step set from the
same bounds `estimate()` validates (floors 1–4, room dimensions 1–20 m, wall height 2.4–4.5 m).
On blur, if the value is out of bounds, the field gets `.field-error` (a red-toned left border
+ background tint) and an inline message directly under it in `var(--danger)` text — plain
English, e.g. "Wall height should be between 2.4 and 4.5 m." Never shows a value as blank or
`NaN`; if calculation can't produce a number the results section shows the error state instead
(see below).

**3. Results table** — a table (or stacked rows on phone, see layout) where each row is one
structural element × one quantity: element name, concrete m³, steel kg/tonnes, blocks pcs,
wastage % (itself an editable number-with-suffix per pattern 2), cost OMR. Header row sticky on
desktop only. On phone, each row becomes its own mini-card (see layout section) so no horizontal
scroll is needed.

**4. Expandable row** — a `<details>`/`<summary>` pair styled as a card with a chevron that
rotates on open. Used for: the assumptions & prices panel (collapsed by default) and every
"How this page was built" timeline card. Summary is always fully readable on its own — no info
is only available once expanded, except the two detail blocks explicitly named in section 2.

---

## Section 1 — "House material estimator"

**Purpose:** collect floors, wall height, and a room list (typed or generated from a m²
shortcut), let the user see and tune the assumptions, and produce a traceable, costed
material breakdown.

### Layout — 1440px

Centered column, `max-width: var(--content-max)` (960px), everything else is page background.
Top to bottom, one card per group, `var(--space-5)` gap:

1. **House details card** — a 3-column grid: Floors, Wall height (m), and the m² shortcut
   toggle + field, side by side. Below that, full width: the room list table (Add room button
   top-right of this sub-block).
2. **Assumptions & prices card** — `<details>` closed by default, summary line always visible
   (see below).
3. **Calculate button** — full-width-of-card button, `var(--space-5)` above/below.
4. **Results** — headline card (4 stats in a row), then the breakdown table card.

### Layout — 390px

Single column, full width minus `var(--space-4)` side padding, no horizontal scroll at any
state (this is asserted by the smoke test). Rules:
- House details grid collapses to 1 column (floors, then wall height, then the shortcut
  toggle+field, each full width, stacked).
- Room list table becomes stacked mini-cards: one card per room with Name / Length / Width /
  Remove, "Add room" as a full-width button below the last room card.
- Assumptions panel: each price/assumption row becomes its own mini-card (label + value input
  + unit on one line, source link + last-checked + reset on the line under).
- Headline stats: 2×2 grid, not 1×4 (keeps numbers legible at 390px).
- Breakdown table becomes one mini-card per structural element, quantities listed as
  label:value lines.

### States

- **Empty (first load):** room list has zero rows, house details are blank (no forced default
  floors/height — an unfilled number input, not a placeholder number that looks like a real
  value). Results area shows a quiet empty-state card: *"Fill in your house details and press
  Calculate to see quantities."* No headline numbers, no table. A `data-action="load-sample"`
  button sits next to Calculate labelled **"Load sample house"** — clicking it fills floors=2,
  wall height=3.0, and the 5-room worked example from `docs/research/assumptions.md` section 6
  (this is also the smoke test's fixture, so its numbers must match that worked example
  exactly).
- **Loading:** calculation is synchronous and local (no network), so no spinner is needed —
  but disable the Calculate button for the duration of the click handler and show a subtle
  "Calculating…" text swap on the button label if the field count is large, so the tap always
  gives feedback.
- **Error (validation failure):** `estimate()` throws a plain-English `Error`. The page must
  never show a blank results area or `NaN`. On error: the results card is replaced by an error
  card (`var(--danger)` left border, warm not alarming tone) showing the exact message from the
  thrown error, e.g. *"Wall height should be between 2.4 and 4.5 m — please fix this and try
  again."* Any field(s) implicated also get `.field-error` per pattern 2 so the user doesn't
  have to hunt.
- **Success:** headline row populates (Total blocks, Total concrete m³, Total steel tonnes,
  Total OMR), breakdown table populates one row per element. A small line above the price
  table always reads: *"These are starting-point prices, not quotes — check with your
  supplier."*
- **Assumptions overridden:** when any assumption/price value differs from its shipped default,
  that row gets a small `.overridden` badge/dot next to its label (e.g. a filled dot + "edited"
  text) and its "reset to default" control becomes active (it's disabled/greyed when the value
  already equals the default). The results headline gets a one-line note under it when at least
  one override is active: *"Using your own numbers for: [comma list of overridden labels]."*
  This note disappears when everything is back to default.

### The m² shortcut

- A toggle/checkbox: **"I don't want to type rooms — just use approximate size."** When
  ticked, the manual room list is replaced by one field: **"Approximate size per floor (m²)"**.
- On leaving that field (blur) with a valid number, the page generates a room list (using the
  room-mix logic in `docs/calc.js`/assumptions) and **replaces the visible room list with it,
  editable** exactly like a typed list — same table, same add/remove rows. Per the accepted
  default, this is a one-time generation: editing the m² number again does NOT regenerate or
  discard the user's edits; only unticking then re-ticking the shortcut (a clear, deliberate
  action) regenerates fresh. A short helper line under the toggle says so: *"This creates a
  starting room list you can edit — changing the size again won't overwrite your edits."*

### Assumptions & prices panel

`<details>` element, **collapsed by default**. Summary line (always visible, not inside the
details): **"Assumptions & prices (tap to review or edit)"** with a small sub-line: *"Defaults
are sourced construction estimates, not guarantees — see each row's source."* When expanded,
one row per assumption/price key from `DEFAULTS`, each row:
- Label (plain English, e.g. "Ready-mix concrete, per m³", not the snake_case key)
- Value input with unit suffix (pattern 2)
- Source: a plain text link-styled reference (the source name from
  `docs/research/assumptions.md`; not a live hyperlink is fine if the source isn't a URL —
  render as plain text in that case, only `<a>` when it is a real URL)
- Last-checked date, small muted text, e.g. "checked 2026-09-22"
- "Reset to default" — a small ghost-style button, disabled/greyed when the field already
  equals its default value

Rows are grouped under sub-headings matching assumptions.md's sections: **Blocks**, **Wall
geometry**, **Concrete**, **Steel**, **Prices**.

### DOM ids / data-attributes (fixed — builder and tests must agree)

Structural/action hooks:
- `data-action="load-sample"` — Load sample house button (loads the 2-floor, 5-room worked
  example)
- `data-action="calculate"` — Calculate button
- `data-result="blocks-total"` — element holding the total blocks headline number (smoke test
  reads its text, strips non-numeric characters, asserts > 0)
- `data-result="concrete-total"` — total concrete m³ headline
- `data-result="steel-total"` — total steel tonnes headline
- `data-result="cost-total"` — total OMR headline
- `id="room-list"` — the room list table/container (works whether rendered as table rows or
  phone mini-cards)
- `data-action="add-room"` — Add room button
- `data-action="remove-room"` (on each row's remove control)
- `id="m2-shortcut-toggle"` — the checkbox/toggle for the m² shortcut
- `id="m2-shortcut-value"` — the m² per floor input
- `id="floors-input"`, `id="wall-height-input"` — the two top-level house fields
- `id="assumptions-panel"` — the `<details>` element for assumptions & prices
- `data-action="reset-default"` (on each reset button, scoped to its row via a `data-key`
  attribute matching the `DEFAULTS` key, e.g. `data-key="price_omr_rebar_tonne"`)
- `id="results-empty"`, `id="results-error"`, `id="results-success"` — the three mutually
  exclusive results states (show exactly one at a time; the other two get `hidden`)
- `id="breakdown-table"` — the per-element breakdown container
- `id="overrides-note"` — the "using your own numbers for…" line

---

## Section 2 — "How this page was built"

**Purpose:** turn `docs/build-log/*.json` into a short, honest, human-readable story of how
the AI agent team built this page — readable by the non-technical owner, inspectable by anyone
technical.

### Layout — 1440 and 390

Same card-stack pattern as section 1, full width of `var(--content-max)` on desktop, single
column on phone throughout (this section has no multi-column layout at any width — it's a
linear story).

Top to bottom:
1. **Intro card** — one short paragraph, plain English, explaining that this page was built by
   a small team of specialised AI agents (a product spec writer, a researcher, a screen
   designer, a builder, and a checker), coordinated by a "dev-lead" agent — plus one honest
   note: *"In this cloud session, the main assistant session ran the dev-lead playbook itself
   rather than dispatching a separate dev-lead agent."*
2. **Org diagram card** — small, static (no external image, built from HTML/CSS boxes +
   connector lines or a simple flexbox tree): one box "Main session (running the dev-lead
   playbook)" at the top, with lines down to one box per distinct `agent` value that appears in
   the build log, in the order first dispatched. On phone this collapses to a simple vertical
   list under the main-session box rather than a wide tree (no horizontal scroll).
3. **Timeline** — one card per dispatch record, in `order` sequence, vertical connector line
   between cards (a simple left-aligned rule + dot, standard timeline visual). Each card,
   collapsed by default, shows in its `<summary>`:
   - Step number (`order`)
   - Agent name (`agent`)
   - Model badge: small pill, text = `model` (haiku / sonnet / opus), colour-coded per
     `var(--badge-haiku)` / `var(--badge-sonnet)` / `var(--badge-opus)`
   - Round badge — only rendered when `round > 1`, small pill reading "round {round}"
   - One-line outcome — `outcome` field, truncated with CSS ellipsis if long, full text
     available on hover/expand
   Expanded (`<details open>`), two labelled sub-blocks:
   - **"What it was asked"** — the `prompt` field, in `var(--font-mono)`, inside a scrollable
     box (`max-height`, `overflow-y: auto`) so one long prompt never pushes the whole page down
   - **"What it reported back"** — the `report` field, normal body text, preserving line
     breaks (`white-space: pre-wrap`)
   If `report` is missing (dispatch not yet finished when the page was built), show a muted
   line instead: *"Still in progress when this page was generated."*

### DOM ids / data-attributes

- `id="build-story"` — wraps the whole section
- `id="build-story-intro"`, `id="build-story-diagram"`, `id="build-story-timeline"`
- Each timeline card: `data-dispatch-order="{order}"` on its root element (no dependency from
  section 1's tests on this — informational for future testing only)

---

## Colour / spacing system (CSS custom properties)

Defined once on `:root`, dark variant under `@media (prefers-color-scheme: dark)` overriding
the same variable names (no separate dark class, no toggle — follows system setting, matches
conventions' "no extra runtime state" spirit).

```
--bg               page background
--surface           card background
--surface-muted     mini-card / nested surface (e.g. phone room-list cards)
--text              primary text
--text-muted        secondary text (units, "last checked", helper lines)
--border            hairline border colour
--accent            primary action colour (Calculate button, links, focus ring)
--accent-contrast   text colour on --accent
--danger            error text/border
--success           success/positive accents (kept minimal — this app is neutral, not celebratory)
--overridden        colour for the "overridden" dot/badge
--badge-haiku
--badge-sonnet
--badge-opus
--radius            card corner radius
--shadow-1           card shadow
--space-1 … --space-6   4/8/12/16/24/32px spacing scale
--content-max        960px
--font-sans          system font stack (see below)
--font-mono          monospace stack for the prompt viewer
```

Light defaults: `--bg` near-white, `--surface` white, `--text` near-black, `--accent` a single
restrained brand blue/teal (owner's call if they want a specific hue — default to a calm
mid-blue if not specified). Dark variant: `--bg`/`--surface` dark charcoal (not pure black,
avoid OLED smear on cheap phone screens), `--text` near-white, same `--accent` hue lightened for
contrast, `--danger` kept legible on dark (avoid pure saturated red — use a slightly desaturated
warm red). Both variants must pass ordinary contrast at a glance in direct sunlight — no light
grey text on white, no low-contrast pastel badges.

## Typography

System font stack only (no external font, per conventions): `-apple-system, BlinkMacSystemFont,
"Segoe UI", Roboto, Helvetica, Arial, sans-serif` for `--font-sans`; `ui-monospace, SFMono-Regular,
Menlo, Consolas, monospace` for `--font-mono`. Base body size 16px minimum (never smaller, this
is read on phones in daylight); headline stat numbers larger, 28–32px, bold, so the four
headline results are scannable at a glance. Labels/units can drop to 13–14px but never below
that. Line-height 1.4+ for body text, 1.2 for headline numbers.

## Touch targets

All buttons, toggle, add/remove-room controls, reset-to-default buttons, and `<summary>` rows
are at least 44×44px tappable area (padding counts) — this applies at 390px width without
exception, since the owner's users are on phones.

---

## Ten-line-or-less builder checklist

- Section 1 above section 2, same page, `<!--CALC-->` and `<!--BUILDLOG-->` markers per
  conventions mark where each is injected by `scripts/build.mjs`.
- Exactly one of `#results-empty` / `#results-error` / `#results-success` visible at a time.
- `data-action="load-sample"` must produce the exact worked example numbers from
  `docs/research/assumptions.md` §6 (≈5,320 blocks, ≈126 m³, ≈13.6 tonnes, ≈8,900 OMR) so the
  smoke test's non-zero-blocks assertion is meaningful, not coincidental.
- No horizontal scroll at 390px or 1440px in any state — verified by the smoke test's
  `scrollWidth <= width` check.
- No external assets: no Google Fonts, no CDN icons — use system fonts and simple CSS/SVG-free
  shapes (borders, radii, unicode chevrons `▾`) for any decorative element.
