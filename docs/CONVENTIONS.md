# House-building — conventions (house rules + verify recipe)

This repo is a single-page, static HTML tool: a house-material estimator (blocks, rebar steel,
ready-mix concrete, OMR cost) plus a "how the agent library built it" story on the same page.
It ships as ONE self-contained file: `index.html`. No server, no framework, no npm dependencies
at runtime. Node (22+) is used only for tests and the build step.

## Golden rule

**Every number on screen is traceable.** Every quantity the page shows must come from a named,
documented assumption in `docs/research/assumptions.md` (block size, rebar kg/m³ per element,
wastage %, price per unit). Prices are NEVER hard-coded anywhere except the editable defaults
table that `src/calc.js` exports, and that table carries a "last checked" date and a source for
each row. A user can overwrite any default in the UI; the calculation must use the overridden value.

## Layout

```
docs/CONVENTIONS.md            this file
docs/specs/estimator.md        the build spec (product-manager)
docs/research/assumptions.md   construction defaults + prices with sources (researcher)
docs/build-log/NN-*.json       one record per agent dispatch (prompt, report, model, outcome)
src/calc.js                    pure estimation functions, no DOM, ES module
src/page.html                  page template; contains the markers <!--CALC--> and <!--BUILDLOG-->
test/calc.test.mjs             node --test core-guarantee tests
scripts/build.mjs              inlines src/calc.js and docs/build-log/*.json into index.html
index.html                     GENERATED — the shareable file. Never edit by hand.
```

## Code rules

- `src/calc.js` is a plain ES module with no DOM access. It exports `estimate(house, overrides?)`
  and `DEFAULTS` (the assumptions + price table). Everything the page displays comes from
  `estimate()`'s return value.
- Input safety: `estimate()` validates every input (finite, positive, within sane bounds —
  floors 1–4, room dimensions 1–20 m, wall height 2.4–4.5 m) and throws a plain-English
  `Error` on bad input. The page catches it and shows the message; it never shows NaN.
- The page must work offline from a `file://` URL. No external scripts, fonts or images.
- Phone-first: usable at 390px wide with no horizontal scroll, and at 1440px.
- Plain English everywhere in the UI. Units on every number (m³, kg, pcs, OMR).
- Generated `index.html` is committed so the file can be shared directly; CI-style check is
  that regenerating it produces no diff.

## Verify recipe (verifier follows this exactly, in order)

1. `node --test test/*.mjs`
2. `node scripts/build.mjs`
3. `git diff --exit-code -- index.html` (generated file is up to date)
4. Browser smoke: `node scripts/smoke.mjs` — opens `index.html` with Playwright
   (`executablePath: /opt/pw-browsers/chromium` if a system chromium is needed), fills the
   sample house, asserts a non-zero block count renders, and fails on any console error, at
   1440 and 390 widths.

Report pass/fail per step. Only failures come back verbose.

## Commit style

Plain English, one line, what changed for the user. Never commit `node_modules`.
