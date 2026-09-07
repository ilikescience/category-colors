# Changelog

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
