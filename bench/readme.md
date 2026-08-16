# Benchmark

The evaluation harness behind the paper. It scores palettes this library
generates against established categorical palettes on the same measurements,
so the comparison does not depend on how any of them were produced.

```sh
npm run bench                                  # 8 colors, 10 trials
node bench/run.js --colors 10 --trials 20
node bench/run.js --format json -o results.json
```

This directory is excluded from the npm tarball by the `files` field in
`package.json`; it ships with the repository, not the package.

## What is measured

| Metric | Why it is here |
| --- | --- |
| `minDeltaE` | The headline number. A categorical palette is only as good as its closest pair, because that pair is the one a reader actually confuses. |
| `meanDeltaE` | Average separation. Useful context, but a high mean hides a bad minimum. |
| `uniformity` | Coefficient of variation across all pairwise distances. Lower means no pair is disproportionately close or far. |
| `minDeltaE` per CVD condition | The same minimum after simulating each deficiency. Deuteranomaly at 0.5 severity is the most common case; the dichromacies are the worst case. |
| `minContrastWhite` / `minContrastBlack` | WCAG 2.1 contrast of the least-contrasting swatch against each background. |

Distances are CIEDE2000 in CIELAB D65. CVD simulation uses culori's filters,
which implement Machado et al. (2009).

## Method

Annealing is stochastic, so generated palettes are sampled over `--trials`
independent runs and reported as mean ± standard deviation. `Math.random` is
replaced with a seeded mulberry32 generator for the duration of the run, and
trial *i* uses `seed + i`, so a given `--seed` reproduces the table exactly.

Two choices worth stating plainly, because both affect the comparison:

- **The similarity evaluator is removed** from the default config, and
  `similarityTarget` is emptied. Left in, the optimizer would be pulled toward
  one particular reference palette, and the benchmark would measure how well it
  reproduces that reference rather than how distinguishable a palette it can
  find.
- **Reference palettes are truncated, not sampled.** `tableau20` scored at 8
  colors is its first 8, because that is what someone using 8 of its colors
  gets. Sampling the best 8 of 20 would measure a palette nobody uses.

## Caveats

The reference palettes are not all optimizing for the same thing. ColorBrewer's
qualitative sets were designed for maps and constrain lightness deliberately;
Carbon and Tableau carry brand and product constraints this benchmark does not
model. A higher minimum ΔE here is evidence that the optimizer separates colors
well, not that the result is a better palette for every purpose. Any paper using
these numbers should say so.

The benchmark also says nothing about aesthetics, nameability, or semantic
associations — the parts of palette design a distance metric cannot see. The
`saliency` evaluator gestures at one of them, but it is not scored here.
