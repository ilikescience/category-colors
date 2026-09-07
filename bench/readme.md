# Benchmark

The evaluation harness behind the paper. It scores palettes this library
generates against established categorical palettes on the same measurements,
so the comparison does not depend on how any of them were produced.

```sh
npm run bench                                  # 8 colors, 10 trials
node bench/run.js --colors 10 --trials 20
node bench/run.js --format json -o results.json
node bench/run.js --names 0.5                  # add the name-difference term at weight 0.5
node bench/run.js --palettailor                # also generate with Palettailor, same seeds
node bench/run.js --qualpal                    # also generate with QualPal, two configurations
node bench/run.js --colorgorical               # also score everything on Colorgorical's criteria (Docker)
```

This directory is excluded from the npm tarball by the `files` field in
`package.json`; it ships with the repository, not the package.

See [related-work.md](related-work.md) for the surrounding literature, where
this library sits within it, and what the comparison still needs;
[references.bib](references.bib) has the citations.

Every measurement here is relative to choices this project made: a
just-noticeable-difference threshold of 20, CIEDE2000 in CIELAB D65, and
Machado et al. (2009) for deficiency simulation. They are conventional and
sourced, but they are choices, and the claim is that the optimizer does well
*on these terms* rather than in some absolute sense. `related-work.md` covers
what happens when the threshold and the model are varied.

## What is measured

| Metric | Why it is here |
| --- | --- |
| `minDeltaE` | The headline number. A categorical palette is only as good as its closest pair, because that pair is the one a reader actually confuses. |
| `meanDeltaE` | Average separation. Useful context, but a high mean hides a bad minimum. |
| `uniformity` | Coefficient of variation across all pairwise distances. Lower means no pair is disproportionately close or far. |
| `minDeltaE` per condition | The same minimum after simulating each deficiency. Deuteranomaly at 0.5 severity is the most common case; the dichromacies are the worst case. `grayscale` stands in for print. |
| `minNameDifference` / `meanNameDifference` | Heer & Stone name difference, `1 - cosine` of two colors' naming vectors, for the closest-named pair and on average. 0 means two colors get the same name. This is the term Colorgorical and Palettailor optimize, so it scores every palette on their axis too. |
| `minContrastWhite` / `minContrastBlack` | WCAG 2.1 contrast of the least-contrasting swatch against each background. |

Distances are CIEDE2000 in CIELAB D65.

**Every CVD number is relative to the model that produced it, so the model is
named wherever the numbers are.** The five deficiency conditions use culori's
filters, which implement Machado, Oliveira and Fernandes (2009). The
`grayscale` condition is culori's luminance projection, the matrix behind CSS
`filter: grayscale()`; it stands in for printing and photocopying and is not a
physiological model of achromatopsia. This matters in practice: color-buddy's
lint rules simulate the same deficiencies with a different model, an LMS-matrix
dichromacy from `@bjornlu/colorblind`, and the two disagree near their
thresholds. A pair measuring 12.45 here can measure 8.78 there.

Name data is built from the c3 repository by `bench/buildNameData.js`, which
documents its truncation.

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

## Other generators

`--palettailor` runs Palettailor (Lu et al., 2021) headlessly on the same
seeds and scores its palettes on the same metrics. Its library carries no
licence file, so [bench/palettailor](palettailor/readme.md) downloads it from
GitHub at a pinned commit on first use rather than vendoring it; that readme
also explains the synthetic data it is given, since Palettailor optimizes a
palette for a specific chart and this benchmark has none.

`--qualpal` generates with QualPal (Larsson) through its Python package, in two
configurations: its own shipped defaults, and CVD adaptation on with the search
box matched to this library's. It is deterministic and takes no seed, so each
configuration contributes one palette rather than a distribution, and its rows
are single values. **The runner deliberately bypasses QualPal's documented
Python class, which in 1.1.0 accepts and validates `cvd`, `metric` and
`background` and then discards them.** See [bench/qualpal](qualpal/readme.md);
report the version with any number taken from it.

`--colorgorical` scores every palette in the run, generated and reference, on
Colorgorical's four criteria (Gramazio, Schloss & Laidlaw, 2017) by running its
original Python code in Docker, and adds Colorgorical's own sample palettes as
a generator row when `bench/colorgorical/samples.json` exists for the palette
size (its authors' script makes sizes 3, 5 and 8). See
[bench/colorgorical](colorgorical/readme.md). Scoring each generator on both
metric sets is what makes the comparison honest: a generator that wins only on
its own objective has shown nothing.

Two of Colorgorical's criteria are computed from the same Heer & Stone data as
this benchmark's but with different formulas. Its name difference is a
Hellinger distance between name-count distributions; `minNameDifference` here
is the `1 - cosine` Heer & Stone define and Palettailor uses. Its name
uniqueness is the quantity the `saliency` evaluator looks up. Colorgorical also
snaps colors to its 5-unit Lab grid before scoring, so its ΔE differs slightly
from `minDeltaE`.

`bench/colorbuddy` runs the palettes through color-buddy's published lint
rules (McNutt et al.). Those rules use a different threshold and a different
CVD simulation model than this benchmark, so they are useful for asking
whether a result depends on the choices made here. They are **not** an
independent validation of the optimizer: an earlier run of them prompted a
change to the default CVD weights, which makes them an input to the design, and
the weights have since been tuned twice.
See [bench/colorbuddy](colorbuddy/readme.md), and `related-work.md` for what
the results do and do not support, including the rules this library fails.

## Caveats

The reference palettes are not all optimizing for the same thing. ColorBrewer's
qualitative sets were designed for maps and constrain lightness deliberately;
Carbon and Tableau carry brand and product constraints this benchmark does not
model. A higher minimum ΔE here is evidence that the optimizer separates colors
well, not that the result is a better palette for every purpose. Any paper using
these numbers should say so.

The exception is `okabeIto`, which *was* designed for the thing this benchmark
measures, and is therefore the comparison worth taking seriously. It posts the
highest plain minimum ΔE of any palette here, including the generated ones, and
much the best deficiency scores of any reference. Its weakness is grayscale,
where orange and sky blue collide. `related-work.md` has the numbers.

**No human judgment enters the benchmark or the objective.** Colorgorical,
CatPAW, and Petroff each ground part of their objective in human ratings:
pair preference, crowdsourced discriminability, or aesthetic screening. This
library optimizes only quantities that can be computed from the colors, and
the benchmark measures only those. Nothing here says whether people find a
generated palette pleasant, whether its colors suit the categories they label,
or whether it would win a preference study against any reference palette. That
is a deliberate scope, and any paper using these numbers should state it as
one. The `saliency` evaluator gestures at nameability but is not scored here;
name difference is.
