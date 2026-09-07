# Changelog

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
