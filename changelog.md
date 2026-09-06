# Changelog

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
