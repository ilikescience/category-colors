# Changelog

## 3.7.0

### Added

- **`config.colorSpace.gamut` chooses the colors a palette may use,
  separately from its mode.** It takes CSS's names: `'srgb'` (the default),
  `'display-p3'`, `'rec2020'`, `'a98-rgb'` and `'prophoto-rgb'`, or `null`
  for no limit. A color outside the gamut gives up chroma in OKLCh, keeping
  its lightness and hue. A gamut wider than sRGB needs a mode that can
  describe it, such as oklch; pairing one with okhsl, hsl or hsv throws. With
  the default the optimizer behaves exactly as in 3.6.0, and seeded runs
  reproduce it.
- **Output follows the gamut.** `formatColor(color, gamut)` and
  `formatPalette(colors, gamut)` write hex for sRGB, `color(display-p3 …)`
  and the like for wider gamuts, and `oklch(…)` for `null`. The CLI's `run`
  writes its output in the config's gamut, `reportJndIssues` takes a `gamut`
  option, and `category-colors report` takes `--gamut <name>` (or `none`).
  A color's `toString()` stays sRGB hex.
- Over 8 seeds in oklch with a chroma window of `[0, 0.4]`, the minimum ΔE at
  12 colors goes from 23.5 in sRGB to 24.0 in Display P3 and 24.7 in
  Rec. 2020, at no cost in run time.

## 3.6.0

### Fixed

- **Colors left sRGB in oklch, oklab, lab and lch palettes.** culori gives
  those modes no gamut, so `inGamut()` passed every color and the annealer
  moved and scored colors that hex output later clipped: the reported scores
  described colors you never got. Over 8 seeds at 8 colors with an oklch
  chroma window of `[0, 0.4]`, 51 of 64 returned colors were outside sRGB,
  and the minimum ΔE of the returned hexes averaged 13.9. Now none are
  outside, and it averages 29.1. Modes without a gamut are held to sRGB by
  reducing chroma in OKLCh, which keeps lightness and hue. When a chroma
  window's minimum is more than sRGB can show at that lightness and hue, the
  color takes the most chroma that fits, below the window. Modes with a gamut
  of their own (okhsl, the default, hsl, rgb and so on) are unchanged, and
  their seeded runs reproduce 3.5.1 exactly.

### Changed

- **The JND report's default threshold is 20, the same as the optimizer's
  `jnd`.** `reportJndIssues` and `category-colors report` used to default to
  25, so a palette could pass the optimizer and still show issues in the
  report: one showed 13 issues on categorycolors.com and 26 in the CLI. Both
  now read the default from `createDefaultConfig().jnd`. Reports that don't
  pass a threshold flag fewer pairs than before. Pass `jndThreshold: 25` or
  `--threshold 25` to keep the old cut.

## 3.5.1

### Fixed

- **`cutoff: 0` produced degenerate palettes.** A cutoff of 0 means "run to
  `maxIterations`", but since 3.4.0 step size was measured against
  `log(cutoff)`. That gave a NaN step, and every mutation landed on the same
  color: a 4-color run could return one color four times. Steps now shrink
  toward wherever the run actually ends: the cutoff, or the temperature at
  `maxIterations` when the cap comes first. Runs that end at the cutoff,
  including every run on the default config, are unchanged, and seeded runs
  reproduce 3.5.0 exactly. Runs capped by `maxIterations` before reaching the
  cutoff now get down to `minMutationDistance` by their last step, where
  before they stopped while steps were still large.

## 3.5.0

### Changed

- **Grayscale is no longer a default evaluator.** `createDefaultConfig()`
  drops its `jnd` term under `grayscale` (weight 0.05). Lightness alone spans
  about 100 ΔE, so past five or six colors no palette can keep every pair
  apart in it, and the term pulled against the others without being met.
  Without it every other condition improves. Over 10 trials at 8 colors the
  unimpaired minimum ΔE goes from 24.3 to 27.9, deuteranopia from 15.0 to
  19.3, protanopia from 15.5 to 17.2 and tritanopia from 16.9 to 20.8. At 12
  colors the unimpaired minimum goes from 18.1 to 22.0. The remaining CVD
  weights are unchanged. Palettes from the default config, seeded or not,
  differ from 3.4.0. To keep optimizing for print, add
  `{ function: jnd, weight: 0.05, cvd: { type: 'grayscale', severity: 1 } }`
  back to `evalFunctions`.
- The benchmark's `min ΔE (CVD)` column now counts only the deficiencies.
  Grayscale is still reported in the per-condition table.

## 3.4.0

### Fixed

- **The starting temperature was orders of magnitude too high.** It was set
  from the mean cost increase of sampled moves, but jnd scores `(jnd / d)^4`,
  so a few near-collisions dominated the mean: stock defaults started between
  7.5e5 and 2e10. Mutation size was also scaled by the raw temperature, which
  is in cost units, so any temperature above 1 meant a full-window jump. The
  first ~14k–24k iterations of every run were random restarts, and
  `initialAcceptanceRate` barely mattered. The starting temperature now comes
  from the median cost increase (20 to 6e3 on stock defaults), and mutations
  shrink from `maxMutationDistance` to `minMutationDistance` in step with the
  cooling schedule, from the starting temperature down to `cutoff`.
  `prepareInitialState` records the starting temperature as
  `state.initialTemperature`. Over 10 trials with the benchmark's settings,
  minimum ΔE goes from 22.2 to 24.3 at 8 colors and from 16.9 to 18.1 at 12,
  and the worst CVD separation from 7.4 to 7.9 and 4.9 to 5.0. Runs reach the
  cutoff in about 12k–18k iterations instead of ~30k, so they take about half
  as long. `coolingRate` and `maxIterations` keep their defaults: cooling at
  0.9995 doubles the run time for little further gain.

### Changed

- **Seeded runs do not reproduce 3.3.0 palettes.** The same state, config and
  seed still give the same palette on every run, but a different one than
  3.3.0 gave.

## 3.3.0

### Added

- **Several windows per channel.** Each entry of `config.colorSpace.ranges`
  may be a list of `[min, max]` windows as well as a single one, and windows
  are hard bounds. Initial colors are drawn with probability proportional to
  window width; a mutation that lands outside every window snaps to the
  nearest edge, around the circle on a cyclic channel; steps are scaled by
  the windows' total width. On a cyclic channel a window with `min > max` is
  the arc through zero: `[300, 60]` is the 120° arc through 0, which used to
  collapse to 60 because its width went negative.

### Changed

- **A partial hue window no longer wraps modulo its own width.** A hue
  stepping past the end of `[100, 200]` used to re-enter at 100; it now
  stops at 200, like any other channel. Cyclic channels wrap modulo the
  mode's full period (360° for hue), so a full-circle hue range behaves as
  before and seeded single-window runs reproduce 3.2.0 exactly.

## 3.2.0

### Added

- **`config.seed` makes a run repeatable.** Every random draw (initial
  colors, the mutation picked each step, acceptance tests, the temperature
  samples) comes from a small seeded generator (mulberry32, no dependency)
  when a seed is set, so the same state, config and seed give the same
  palette. Omitted, the optimizer draws from `Math.random` as before.
  Order optimization was already deterministic. `generatePalette` always
  runs seeded, drawing a seed when none is given, and reports the one it
  used as `result.seed`; the CLI gains `--seed <int>` and prints the seed in
  its text and JSON output.

### Changed

- Random initial colors are drawn by the package rather than culori's
  `random()`, one uniform draw per channel in channel order, which is the
  same sequence culori produced.

## 3.1.0

### Fixed

- **CVD terms ignored about 1% of simulated colors in okhsl and okhsv
  palettes.** culori's deficiency filters work in rgb and hand back a color
  in the palette's own space. For a simulated color that lands just outside
  sRGB (a red of 1.04, say; mostly under tritanopia) okhsl has no sensible
  coordinates, and converting it on to Lab gave values in the thousands. Such
  a color measured as immensely far from every other, so its JND penalty
  under that condition vanished and the optimizer never pulled it apart from
  its neighbours. oklch palettes were not affected. `simulateCvd` now returns
  the simulated colors in rgb and they are measured from there. Over 30
  seeds at the app's defaults the worst CVD separation holds at 8 colors
  (7.62 → 7.62) and improves at 12 (4.77 → 4.84), the worst seed improves at
  both sizes, and normal separation gives up about half a ΔE (22.7 → 22.0 at
  8 colors): the constraint the optimizer was skipping now costs something.

### Changed

- **Same seed, different palette.** Three changes alter what a step computes,
  so a seed no longer reproduces a 3.0.x palette: the fix above; `energy`
  measures each pair once rather than in both directions (CIEDE2000 differs
  between the two only in its last bits); and `jnd` computes its fourth power
  as two squarings, several times faster than a general power. The quality
  figures above include all three.
- **`simulateCvd` returns rgb colors**, whatever space the originals were
  in. Formatting them is unchanged; code that read the simulated colors'
  okhsl or oklch channels will need to convert.

### Performance

- **Pairwise evaluators share one cached distance matrix per palette.**
  `energy`, `range` and `jnd` each used to look every pair's cached distance
  up again, by id, on every step, which at 20 colors was most of a step. They
  now read a matrix from `pairwiseDistances` in `src/utils/deltaE.js`, kept
  for the last few palettes measured and copied forward to a palette that
  differs in one color, so a step fills in one row and column and sums the
  rest. Steps at categorycolors.com's defaults, Node 24, both columns
  measured on the same day (the machine was slower than for the 3.0.2 table):

  | colors | 3.0.2 | now | |
  | --- | --- | --- | --- |
  | 4 | 23 µs/step, 0.56 s | 22 µs/step, 0.55 s | 1.0× |
  | 8 | 34 µs/step, 1.00 s | 30 µs/step, 0.87 s | 1.15× |
  | 12 | 53 µs/step, 1.56 s | 41 µs/step, 1.20 s | 1.3× |
  | 20 | 106 µs/step, 3.21 s | 67 µs/step, 2.01 s | 1.6× |

  That change alone kept output identical to the last bit. With the changes
  above as well, a step is 15, 20, 26 and 41 µs at 4, 8, 12 and 20 colors
  (0.38, 0.58, 0.76 and 1.22 s a generation), a further 1.5–1.7×. A color's
  Lab and rgb coordinates now have their own fields on its memo rather than
  a lookup by name, and a memo reads its channels by name too.

## 3.0.2

### Performance

- **Generation is 4–18× faster, with identical output.** Each annealing step
  changes one color, but every step used to re-convert every color to Lab,
  re-simulate it under each CVD condition, and re-measure every pair. Those
  values are now memoized per color (`src/utils/colorMemo.js`), so a step only
  computes what involves the color that moved. CPU per generation at
  categorycolors.com's defaults (okhsl, 60000 iterations, 4 CVD terms), Node 24:

  | colors | before | after | |
  | --- | --- | --- | --- |
  | 4 | 83 µs/step, 2.0 s | 20 µs/step, 0.5 s | 4.3× |
  | 8 | 324 µs/step, 9.4 s | 35 µs/step, 1.1 s | 9.2× |
  | 12 | 716 µs/step, 22.8 s | 55 µs/step, 1.8 s | 13× |
  | 20 | 1951 µs/step, 56.7 s | 111 µs/step, 3.3 s | 18× |

  The caches only skip work: memoized conversions take culori's own steps, and
  distances come from culori's own functions. Seeded runs reproduce 3.0.1's
  palettes and costs bit for bit (28 of 28 in `bench/perf.js`), and a test
  compares seeded runs with the caches on and off. A color edited in place is
  detected by its channel values and recomputed.
  `node bench/perf.js` reproduces the timings.

## 3.0.1

### Fixed

- **`tableau10`'s yellow was `#edc949`; it is now `#edc948`.** Tableau
  publishes no hex list — their KB article describes a method for extracting
  the codes rather than giving them — so every implementation carries a
  slightly different sample, and this one had drifted a digit. The value here
  now follows Tableau's own definition as captured in ggthemes'
  `data-raw/theme-data/tableau.yml`, which is the best-sourced version
  available because it carries Tableau's internal swatch names alongside the
  hexes; a screen-sampled palette does not come with those names attached.

  **No benchmark number changes.** The benchmark truncates `tableau10` to its
  first eight colors and the yellow sits at index 5, so this was inside the
  measured set, but `tableau10`'s closest pair does not involve it: minimum ΔE
  is 18.07 to nine decimal places either way. Mean ΔE moves by 0.017. The
  `tableau10` row in `bench/related-work.md` stands as published.

  `tableau20` is unaffected — it is the paired palette and carries `#b6992d`
  and `#f1ce63` for its yellows.

### Documentation

- **`palettes.js` now records where the Tableau values come from.** The
  correct yellow reads as a typo next to d3's, so the array carries a note
  naming both traps: `d3-scale-chromatic`'s Tableau10 differs in four
  positions (including `#edc949`), and Vega's `tableau10` is an entirely
  different palette. Neither is a source to correct these against.

## 3.0.0

### Changed

- **The CVD weights drop sharply, and the palettes get better separated
  without getting less accessible.** `createDefaultConfig()` carried its four
  CVD terms at 0.3 (protanopia), 0.3 (deuteranopia), 0.2 (tritanopia) and 0.1
  (grayscale) against an unimpaired `jnd` term of 0.3 — about 60% of the whole
  objective. They now sit at 0.1 / 0.1 / 0.1 / 0.05 against an unimpaired term
  of 1.

  Anyone generating palettes with the defaults will get different palettes.
  Measured over ten seeds at eight colors:

  | | 2.0.x | 3.0 |
  | --- | --- | --- |
  | minimum ΔE | 19.0 | 22.6 |
  | minimum ΔE, deuteranopia | 16.1 | 16.3 |
  | minimum ΔE, protanopia | 16.2 | 14.9 |
  | minimum ΔE, tritanopia | 17.2 | 15.6 |
  | minimum ΔE, grayscale | 7.9 | 7.7 |
  | **worst pair, all six conditions** | **7.9** | **7.7** |

  2.0.0 moved these terms in the other direction and was right to; this is not
  a reversal of that decision but a correction to how hard it was pushed. The
  terms saturate. Two thirds of the weight they carried bought 0.2 of
  worst-case protection and cost 3.6 points of ordinary separation.

  The reason is visible in the rows above: **worst-case is pinned to grayscale
  in both configurations**, never to a deficiency. The red-green terms were
  defending a margin that was never the binding constraint, so relaxing them
  spends nothing that mattered. Grayscale stays at 0.05, where its own score
  plateaus.

  To restore the old behaviour, raise the four CVD weights and lower the
  unimpaired `jnd` term; the readme shows the shape of the trade.

- **A note on where the headroom came from.** Benchmarking QualPal (Larsson) is
  what prompted this. With its CVD adaptation on it reaches a worst-deficiency
  ΔE of 21.8 and a plain minimum of 24.7 — better than this library on both,
  before and after this change. That is what made it clear the deficiency
  weights here were buying margin that was not winning anything, while the
  plain-separation number lagged every other generator. What QualPal has no
  term for is grayscale, where it scores 0.9 against 7.7 here, so print is the
  axis this library still leads. At 22.6 this release also clears `okabeIto`
  (21.3) on the mean, though four of ten trials do not.

### Added

- **`petroff6`, `petroff8` and `petroff10`** join `palettes`. Petroff's
  accessible colour cycles are the nearest published work to this library's
  objective: minimum perceptual distance under simulated CVD, plus an explicit
  minimum *lightness* separation for grayscale, plus an aesthetic-preference
  model. They are the only other palettes in the comparison set with any
  grayscale constraint, which makes them the comparison this library's claim
  most needs to survive. Measured at eight colours, `petroff8` scores the best
  worst-deficiency of any reference (11.1, against Okabe-Ito's 8.8) and a
  grayscale minimum of 2.0 — better than every other reference and still well
  below the 7.7 here.

  Each length is optimized separately, so `petroff8` is not the first eight of
  `petroff10`. The benchmark compares them only at their own length rather than
  truncating, which is what it does with every other reference.

## 2.0.1

### Fixed

- **The shipped type declarations omitted `grayscale`.** 2.0.0 added a
  `grayscale` simulation and a default config that uses it, but `CvdType` in
  `index.d.ts` still listed only the six deficiencies, so the package's own
  `createDefaultConfig()` did not typecheck against its own types and any
  TypeScript caller passing `'grayscale'` got TS2322. Runtime was never
  affected.

  `CvdType` keeps its six deficiencies, because grayscale is not one. The new
  `SimulationType` is `CvdType | 'grayscale'` and is what `simulateCvd` and
  `CvdSimulation.type` now accept. Both are re-exported from
  `category-colors/report`.

  Tests now cross-check the declarations against the runtime, so a simulation
  the code accepts but the types omit fails the suite.

### Added

- **`okabeIto`** joins `palettes`. Okabe & Ito's Color Universal Design set is
  the reference palette actually designed to survive color vision deficiency,
  which makes it the comparison worth making. Nine colors, in the ggokabeito
  order, so the first eight match Wilke's colorblindr variant.

### Documentation

- `CvdSimulation.severity` now says that only `1` is meaningful for
  `'grayscale'`. A half-desaturated palette is not something anything prints,
  so a fraction there models nothing. The shared field invites `0.5`, which is
  reasonable for a deficiency and meaningless here.

## 2.0.0

### Changed

- **The default palette now optimizes for color vision deficiency far harder,
  and trades ordinary separation to do it.** `createDefaultConfig()` previously
  carried two CVD terms, protanomaly and deuteranomaly at half severity. It now
  carries four at full severity: protanopia and deuteranopia at weight 0.3
  each, tritanopia at 0.2, and grayscale at 0.1. The unimpaired `jnd` term
  rises from 0.15 to 0.3 to hold some separation back.

  Anyone generating palettes with the defaults will get different palettes.
  Measured over ten seeds at eight colors:

  | | 1.x | 2.0 |
  | --- | --- | --- |
  | minimum ΔE | 23.8 | 19.0 |
  | minimum ΔE, deuteranopia | 8.9 | 16.1 |
  | minimum ΔE, protanopia | 11.7 | 16.2 |
  | minimum ΔE, tritanopia | 10.6 | 17.2 |
  | minimum ΔE, grayscale | 0.8 | 7.9 |

  The choice was made from measurement, not taste: modeling full dichromacy
  rather than anomaly at half severity roughly doubled the CVD minima for
  about one point of unimpaired separation, and an independent linter
  (color-buddy) went from failing the deuteranopia rule six times in ten to
  passing it ten times in ten. To get the old behavior, keep the terms you
  want and raise the unimpaired `jnd` weight; the readme shows how.

### Added

- **`grayscale` as a simulation type** for `simulateCvd` and the `cvd`
  descriptor. It is culori's luminance projection, the matrix behind CSS
  `filter: grayscale()`, and stands in for printing and photocopying. It is
  deliberately not called achromatopsia, because it is not a physiological
  model of anyone's vision.

### Documentation

- Every CVD number in the readme and the benchmark now names the model that
  produced it. The deficiency filters implement Machado, Oliveira and
  Fernandes (2009) via culori. This matters: color-buddy's lint rules simulate
  the same conditions with a different model and disagree near their
  thresholds, where a pair measuring 12.45 under one can measure 8.78 under
  the other.

## 1.1.0

### Added

- **Name difference evaluator**, at `category-colors/evaluators/names`. Two
  colors people would both call "blue" are confusable in a legend even when
  they are far apart in ΔE; this scores that. Alongside the evaluator it
  exports `nameDifference(a, b)` (`1 - cosine` of two colors' naming vectors),
  `nameTerms(color)` (the terms people use for a color, with each term's
  share), and `terms` (all 153 of them). This is the quantity Colorgorical and
  Palettailor optimize, so the objective is now comparable with theirs.
- `voxelKey` is exported from `category-colors/evaluators/saliency`, mapping a
  color to its cell on the naming model's grid.

### Fixed

- **The `saliency` evaluator's sign was inverted.** It returned mean saliency
  as a cost, and because costs are minimized, adding it pushed the palette
  *toward* colors people cannot agree on a name for — the opposite of what it
  documented. It now returns `1 - mean saliency`. Colors outside the model's
  sRGB grid have no naming data and now cost the maximum rather than nothing,
  which previously rewarded the optimizer for leaving the gamut.

  This changes results for anyone who had added `saliency` to `evalFunctions`.
  It is not in the default config, so palettes generated with defaults are
  unaffected.

### Changed

- The packed size grows from 79 kB to 244 kB, because the name-difference
  evaluator carries a 260 kB lookup table. Nothing reachable from the main
  entry imports it: it is available only through
  `category-colors/evaluators/names`, so a bundler drops it unless you ask for
  it. See "Bundle size" in the readme.

## 1.0.0

First npm release.

The code began in March 2022 as a single 307-line script accompanying the
essay: you edited constants at the top of `index.js`, ran `node index.js`, and
read the palette out of the console. What follows is what changed between that
script and this package. None of it is a change anyone had to upgrade through,
because there was no earlier release — but the script circulated with the essay
for four years, so this is what is different if that is the version you know.

### Added

- **A public API.** The optimizer is importable rather than something you edit
  in place: `prepareInitialState`, `runSimulatedAnnealing`,
  `runWithOrderOptimization`, `cost`, `costBreakdown`, `simulateCvd`,
  `createDefaultConfig`, `createDefaultState`, `deltaE`, `createColor`,
  `getChannels`, `palettes`, and `reportJndIssues`. Four subpath exports
  (`/report`, `/evaluators`, `/evaluators/saliency`, `/cli`) let callers take
  parts without the whole. The main entry is browser-safe — nothing reachable
  from it imports a Node builtin, and a test enforces that.

- **A command line.** `category-colors run` generates a palette without editing
  project files, taking config and state from module paths and writing text,
  JSON, or a bare palette array. `category-colors report` audits an existing
  palette for pairs below a just-noticeable-difference threshold, with
  repeatable `--cvd type:severity` simulations.

- **Pluggable evaluators.** The cost function was six weights hardcoded in one
  closure. It is now `config.evalFunctions`, an array of
  `{ function, weight, ...options }` descriptors, each evaluator reading its
  parameters off its own descriptor — so the same evaluator can appear several
  times with different settings, which is what makes several CVD terms possible
  at once. `costBreakdown` itemizes the total per descriptor.

- **Four new evaluators.** `jnd` penalizes pairs that fall below a
  just-noticeable difference. `contrast` applies WCAG ratios against a
  background, and optionally between adjacent colors. `avoid` is the inverse of
  `similarity`, pushing the palette away from given colors within a radius.
  `saliency` scores how consistently people name a color, using Heer & Stone's
  naming model.

- **Per-color constraints.** `fixedColor` excludes a color from mutation,
  `fixedOrder` pins it during reordering, and `lockedChannels` holds some
  channels while the rest vary — locking a brand hue while saturation and
  lightness move to meet a contrast requirement, for instance. `examples/`
  shows each.

- **Order optimization.** `runWithOrderOptimization` reorders the annealed
  palette so neighboring swatches sit at even perceptual distances. Exhaustive
  below ten colors and a pairwise-swap local search above, because exhaustive
  search is O(n!).

- **A loss curve.** `recordHistory` collects `[iteration, cost]` samples on the
  returned state, which is what you need to plot convergence.

- **Six reference palettes** at `palettes`: `observable10`, `d3category10`,
  `carbon`, `tableau10`, `tableau20`, and `colorBrewer3_10`. For comparison, or
  as similarity targets.

- **Tests and CI.** 54 tests on the built-in Node runner, run against Node
  22.12 and 24. A second CI job packs the tarball, installs it into a scratch
  project, and imports every subpath, so a broken `exports` map or a file
  missing from `files` fails before publish rather than after.

- **A benchmark harness**, in `bench/`, scoring generated palettes against the
  reference palettes on the same measurements, with `Math.random` replaced by a
  seeded generator so a given `--seed` reproduces the table exactly. It ships
  with the repository, not the package.

### Changed

- **chroma-js gives way to culori**, by way of colorjs.io, which the port went
  through first. `munkres-algorithm` joins it so `similarity` can match palette
  to target by optimal assignment rather than by greedy nearest-neighbor, which
  could match several colors to the same target.

- **CVD simulation moves from Brettel, Viénot and Mollon (1997) to Machado,
  Oliveira and Fernandes (2009)**, via culori's deficiency filters — replacing
  a hand-inlined implementation of the former, sRGB lookup table and all. The
  essay's images were made with the 1997 model, so the code no longer matches
  them.

- **The objective penalizes the closest pair rather than the average.** The
  2022 cost function scored `100 − mean distance` under each condition. A high
  mean hides a bad minimum, and the minimum is the pair a reader actually
  confuses, so `jnd` charges `(threshold / ΔE) ** 4` per pair instead: near zero
  while a pair is comfortably separated, rising steeply once it is not.

- **The default CVD terms go from three to two, and from dichromacy to anomaly
  at half severity** — protanomaly at weight 0.15 and deuteranomaly at 0.5,
  weighted by prevalence instead of the flat 0.33 each the script gave
  protanopia, deuteranopia and tritanopia. 2.0.0 reverses the anomaly half of
  this decision on measurement; see above.

- **The working space and the distance metric are both configurable.** The
  script mutated in RGB and measured with chroma's `deltaE`, both hardcoded.
  `config.colorSpace` now takes any culori mode with per-channel ranges —
  `okhsl` by default — and detects cyclic channels such as hue from the mode
  definition rather than special-casing them. `config.colorDistance` picks the
  method and the space it is measured in.

- **The annealing schedule tunes itself.** The starting temperature was
  hardcoded at 1000; it is now derived by sampling random mutations for a
  target acceptance rate. Mutation distance scales with temperature between
  `minMutationDistance` and `maxMutationDistance` rather than being a fixed
  ±0.05 nudge on one RGB channel, `maxIterations` caps the run regardless of
  temperature, and the cooling rate moves from 0.99 to 0.999.

- **Cost is carried on the state instead of recomputed.** The 2022 loop called
  `cost()` three times per move, each one a full pass over every pair under
  every simulation. Distance options and distance matrices are cached as well.

- **State preparation no longer mutates the config it is handed.**

- **ESM, with side effects declared** so a bundler can drop what you do not
  import — which matters because `saliency` carries a ~150 kB lookup table.
  Node 22.12 is the floor: it is the first release where `require()` can load
  an ESM package, so CommonJS callers still work without a build step.

- **Renamed from `categorycolors`**, and licensed MIT in `package.json`, which
  had said ISC while the license file said MIT.

### Documentation

- The readme goes from 30 lines listing which constants to edit to 356
  covering install, the API, the CLI, bundle size, configuration, channel
  locking, contrast, avoid, custom evaluators, and JND reporting.

- **Every evaluator names the work behind it**: CIEDE2000 (Sharma, Wu and
  Dalal, 2005), the CVD model (Machado, Oliveira and Fernandes, 2009), the
  just-noticeable-difference model (Stone, Szafir and Setlur, 2014), and the
  color-naming model behind `saliency` (Heer and Stone, 2012).
  `bench/related-work.md` places the library in that literature, and
  `bench/references.bib` carries the citations.
