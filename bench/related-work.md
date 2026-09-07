# Related work

Scaffolding for the write-up: what already exists, where this library actually
sits, and which claims will not survive review. Citations are in
`references.bib`; entries marked UNVERIFIED there still need checking against
the publisher.

## The landscape

### Optimization-based categorical palette generation

These are the direct neighbours. All four take a multi-term objective over a
palette and search for a good one.

**Colorgorical** [gramazio2017colorgorical] scores candidate palettes on a
weighted sum of perceptual distance, name difference, name uniqueness, and pair
preference, sampling semi-randomly from CIELAB. The last two terms come from
human ratings, which is the axis this library has nothing to say about. It is a
web tool; the source is Python 2.7 with a C extension.

**Palettailor** [lu2021palettailor] uses **simulated annealing** to maximize a
combination of three scoring functions — point distinctness, name difference,
and color discrimination — and couples palette *creation* with palette
*assignment*, choosing which class gets which colour based on the data. This is
the closest existing work by method.

**Petroff** [petroff2021accessible] optimizes under minimum-perceptual-distance
constraints **including for simulated CVD**, plus minimum-lightness-distance for
grayscale, maximum-lightness for white-background contrast, and a colour-saliency
term drawn from the same Heer & Stone model this library uses.

**CatPAW** [tseng2026catpaw] derives palettes from four crowdsourced experiments
on redundant colour–shape encoding. Newest of the group and from Szafir's lab;
worth reading before submitting anything.

### Perceptual foundations

What the evaluators are built on, rather than competing with:
CIEDE2000 [sharma2005ciede2000] for distance; Machado et al.
[machado2009physiologically] for CVD simulation — the essay's images used
Brettel et al. [brettel1997computerized], and both the readme and the essay's
footnote 8 now say the code moved to Machado; Stone, Szafir & Setlur [stone2014engineering]
for size-dependent JND, with Szafir [szafir2018modeling] as the successor a
reviewer may ask about; and Heer & Stone [heer2012color] for the saliency table.

### Linting and evaluation

**color-buddy** [mcnutt2025linters] is a GUI linter with visual explanations,
integrated fixes, and user-defined rules. It evaluates palettes; it does not
generate them. See the section below on why that distinction matters.

### Reference palettes

ColorBrewer [harrower2003colorbrewer], Tableau, d3, Observable, and Carbon are
the benchmark's comparison set. Each was designed under constraints the
benchmark does not model, which `bench/readme.md` already states.

## Where this library actually sits

The honest read: **optimization-based categorical palette generation is a
populated field, and simulated annealing over a multi-term colour objective is
already published** (Palettailor). A paper claiming "we apply simulated
annealing to categorical palette generation" describes prior art.

What is plausibly distinctive, in rough order of strength:

1. **CVD robustness as weighted objective terms rather than constraints.** The
   default config carries three JND terms — unimpaired, protanomaly 0.5, and
   deuteranomaly 0.5, the last at the highest weight. Petroff treats CVD as a
   *constraint* to satisfy; here it is a cost to trade off, so the optimizer
   will accept a slightly worse unimpaired palette for a much better
   deuteranomalous one. That trade is the interesting behaviour and it is
   measurable — it is what the CVD column of the benchmark shows.
2. **Channel locking.** Holding a brand hue fixed while saturation and lightness
   move to satisfy contrast is a real practitioner constraint the cited
   generators do not expose.
3. **The `avoid` evaluator.** Steering away from a background or semantic
   colour, as the inverse of similarity, appears not to be in the others.
4. **Shipping as a composable library.** Colorgorical, Palettailor, and
   color-buddy are tools. This is an npm package with a documented evaluator
   interface, so the objective is extensible by users rather than fixed by the
   authors. That is an artifact contribution, and it suits a short/tools paper
   better than a full paper.

What is *not* distinctive: simulated annealing, weighted-sum objectives,
CIEDE2000 distance, name/saliency terms, or the observation that categorical
palettes need discriminable colours.

## Continuous cost versus discrete lint

The argument for the cost-function approach, stated at full strength: a lint
rule is a predicate, so it can only report that a palette failed. A cost
function encodes *how badly* a palette fails and stays differentiable-ish in the
sense that matters to a search — the exponential penalties
(`(threshold / value) ** 4`) sit near zero while satisfied and rise steeply once
violated, giving the annealer a gradient to follow. That is what turns
"this palette is wrong" into "here is a better palette", with no human in the
loop. Degrees of correctness are what make the search self-healing.

That is correct, and it is the right description of why this architecture works.
Two scoping caveats before it goes in a paper:

**It distinguishes this work from the wrong opponent.** color-buddy is a design
probe studying linter UX — a different artifact class, evaluated on whether
designers understand and act on its feedback. Claiming a generator is superior
to a linter reads as a category error, and a reviewer who works on linters will
say so. Worse, color-buddy already offers *integrated fixes*, so even the repair
distinction is narrower than it sounds; theirs is human-in-the-loop, this is
automatic search. Meanwhile the actual competitors — Colorgorical, Palettailor,
Petroff — **all** use continuous multi-term objectives. Against them, "continuous
cost enables search" is table stakes, not a differentiator.

**The weighted sum has a failure mode the linter does not.** Normalising weights
against their sum means a strong score on one term can mask a violation on
another; nothing in `cost()` prevents a palette with one confusable pair from
scoring well overall. A hard lint rule cannot be traded away like that. This is
exactly why the benchmark reports **minimum** pairwise ΔE rather than the mean,
and it is worth saying so explicitly — it turns a weakness into evidence of care.
`costBreakdown()` recovers per-term attribution, which is the other half of the
answer to "a linter tells you which rule failed and a scalar does not".

The defensible framing is complementarity: continuous relaxation is what makes
automated search possible, discrete rules are what make guarantees and
explanations possible, and **color-buddy is the natural independent validator for
this library's output** — third-party rules, not authored by whoever wrote the
optimizer. Running generated palettes through it and reporting the lint results
is a stronger move than arguing with it.

## Palettailor, measured

`node bench/run.js --palettailor` runs Palettailor's own library headlessly on
the same seeds (see `bench/palettailor/readme.md` for how it is fed data it
was never designed to run without). At 8 colours, ten trials, seed 1:

- **Palettailor wins on plain minimum ΔE**, 26.6 ± 2.4 against 19.0 ± 1.5, and
  the gap widened when the defaults here took on the CVD terms. It searches
  lightness 35–95 and any chroma while this config works a mid-range okhsl box
  and now spends much of its budget on four simulated conditions. State this
  plainly rather than burying it.
- **It loses badly the moment any deficiency is simulated.** Worst case across
  every condition: 1.2 ± 1.1 against 7.9 ± 0.3. Under deuteranopia 5.8 against
  16.1, protanopia 9.2 against 16.2, tritanopia 10.5 against 17.2, grayscale
  1.2 against 7.9. Palettailor has no CVD term at all, and its numbers sit
  among the hand-designed reference palettes.
- **On name difference Palettailor is now ahead**, 0.34 ± 0.16 against
  0.16 ± 0.12. It optimizes name difference and this config does not, and the
  CVD terms cost it: the same measurement was 0.36 before they were added.
  `--names 0.5` recovers it, and the paper should either enable that term or
  concede the point.

So the trade is explicit: this library gives up plain separation and
nameability to hold every simulated condition above 7.9, where the closest
competitor drops to 1.2. Whether that is the right trade depends on the
reader's audience, which is an argument worth making directly rather than
winning on a single column. Two further caveats: the
lightness-range difference means the plain min-ΔE comparison is partly a
comparison of search spaces, not search methods; and Palettailor's annealing
schedule accepts nearly every move for the first 60% of its run, so it is
closer to a short hill-climb than to the annealing this library does — see the
runner's readme for what its code actually does.

## Colorgorical, cross-scored

`node bench/run.js --colorgorical` runs Colorgorical's original Python code in
Docker (`bench/colorgorical/readme.md`) and scores every palette in the run on
its four criteria, each the minimum over pairs. Same run as above:

| | ΔE | name diff | pair pref | name uniq |
| --- | --- | --- | --- | --- |
| category-colors | 18.6 ± 2.2 | 0.50 ± 0.10 | −44 ± 6 | 0.57 ± 0.08 |
| palettailor | 26.6 ± 2.8 | 0.63 ± 0.13 | −67 ± 8 | 0.27 ± 0.10 |
| colorgorical (own samples) | 15.8 ± 3.2 | 0.45 ± 0.07 | −23 ± 9 | 0.41 ± 0.11 |
| best reference | 19.7 (observable10) | 0.70 (d3) | −13 (tableau20) | 0.59 (ColorBrewer) |

And the reverse direction, Colorgorical's ten 8-colour sample palettes at its
all-equal slider setting scored on this benchmark's metrics: minimum ΔE
15.8 ± 3.3 against 19.0 here, worst case across every simulated condition
0.9 ± 0.6 against 7.9 ± 0.3, and cosine name difference 0.09 ± 0.06 against
0.16 — its closest-named pair is usually two shades of the same name.

Note that this library's Colorgorical scores moved when its defaults took on
the CVD terms, and not all in one direction: ΔE fell from 24.0 to 18.6 and
name difference from 0.61 to 0.50, while pair preference improved from −58 to
−44 and name uniqueness from 0.52 to 0.57. Spreading lightness evenly appears
to help on the two criteria grounded in human ratings, which is a happy
accident rather than something the objective asked for, and should be
described as one.

Three things to know before quoting these:

- **Colorgorical's name difference is a different formula.** Its C code takes
  the Hellinger distance between name-count distributions,
  `sqrt(1 - Σ sqrt(p_a p_b))`; Heer & Stone define, and Palettailor and the
  `names` evaluator use, `1 - cosine`. Same data, different metric, and the
  two rank palettes differently (carbon scores 0.11 on cosine and 0.60 on
  Hellinger). The paper should say which it means and never mix the columns.
- **Pair preference is where human judgment lives**, and Colorgorical still
  wins it (−23 against −44 and −67): its samples are selected on it, and
  neither this library nor Palettailor models it at all. It buys that with a
  minimum ΔE of 15.8, and a worst-case-across-conditions of 0.9. That is the
  scope disclaimer in numbers: this library trades preference for
  discriminability, on purpose.
- **Name uniqueness is the `saliency` quantity**, and this library scores well
  on it *without* optimizing it (0.57, the best of any palette measured here,
  reference palettes included), because the
  jnd terms push colours apart and apart tends to mean prototypical. The
  `saliency` evaluator now returns `1 - mean saliency`, so enabling it pushes
  the same way this column measures; before that fix it inverted the criterion
  and rewarded colours nobody can name.

Colorgorical's sample palettes come from `bench/colorgorical/samples.json`,
one seeded run of its authors' own sampling script (20 slider settings × sizes
3, 5, 8 × 10 palettes); the table uses the setting that weights ΔE, name
difference and pair preference equally.

## color-buddy, as independent validator

The section above argues that the right move is to run generated palettes
through color-buddy's rules rather than argue with it. `bench/colorbuddy`
does that with the published `color-buddy-palette-lint` package and only its
built-in rules, so they are third-party in the sense that matters: not
authored by whoever wrote the optimizer.

**Do not quote a pass count.** Of the 38 prebuilt rules, nine never apply to
an untagged categorical palette and four more pass vacuously because they
check only colors carrying a tag the GUI sets; `bench/colorbuddy/readme.md`
names all thirteen. Worse, the count does not rank: ten generated palettes
fail 9.9 rules on average, `tableau10` fails 9, and a control palette of
eight near-identical colors fails only 13. A metric that separates a good
palette from a deliberately terrible one by three points is not a quality
measure.

The rule identities, over ten generated palettes and the six reference
palettes truncated to eight colors:

| rule | generated | references |
| --- | --- | --- |
| `cvd-friendly-protanopia` | 10/10 pass | 0/6 pass |
| `cvd-friendly-deuteranopia` | 10/10 pass | 1/6 pass (carbon) |
| `cvd-friendly-tritanopia` | 8/10 pass | 0/6 pass |
| `cvd-friendly-grayscale` | 0/10 pass | 0/6 pass |
| `mutually-distinct` | 10/10 pass | fails only for the control |
| `color-name-discriminability` | 10/10 pass | fails only for the control |
| `even-colors-lightness` | 10/10 pass | — |
| `fair-nominal` | 0/10 pass | — |

Four things follow.

- **All three dichromacy rules now pass, and no reference palette passes more
  than one.** This is the CVD claim confirmed against thresholds and a
  simulation model nobody here chose. It is also a direct consequence of the
  default config being changed to model dichromacy rather than anomaly at half
  severity, which was itself prompted by an earlier run of this same lint.
- **The distance rules agree with the benchmark.** `mutually-distinct` and
  `color-name-discriminability` pass for every generated palette and fail for
  a control of near-identical colors, which is the check that the linter and
  `minDeltaE` measure the same thing.
- **`cvd-friendly-grayscale` never passes, and cannot.** It requires every
  pair to differ by more than 9 after a grayscale projection. Adding a
  grayscale term to the objective lifted the palettes' own grayscale minimum
  from 0.8 to about 7.9, but the score plateaus there no matter how the weight
  is raised: eight colors cannot be spread far enough in lightness alone while
  the other terms still hold. The gap between 7.9 and the threshold of 9 is
  the honest limit, and the reference palettes sit between 0.0 and 2.5, with
  two of `d3category10`'s colors identical in grayscale.
- **`fair-nominal` never passes, and the conflict is real.** It wants a
  lightness range under 50, and spreading lightness is exactly how the
  grayscale and CVD terms buy separation. Its own failure message says it "is
  naturally at odds with color vision deficiency friendly palettes". Adding the
  grayscale term did, though, flip `even-colors-lightness` from 1/10 to 10/10:
  the lightness spread is now even, just wide.

A caution for anyone re-running this: measure over trials, never one palette.
The first two attempts here, on one palette each, disagreed with each other
about deuteranopia and protanopia, and under the previous defaults the
deuteranopia verdict was close enough to the threshold to flip with the seed.
The tables above are over ten trials, and the margins are now wide enough that
they no longer flip; that is itself part of the result.

## What the benchmark still needs

- **A manual pass on the three citations with no DOI**, named in the header
  of `references.bib`.
- **Decide whether the new default trade is the right one for the paper's
  headline.** Modeling the dichromacies, tritanopia and grayscale cost 4.8
  points of unimpaired minimum ΔE, from 23.8 to 19.0, which is close to
  `tableau10` at 18.1 and `observable10` at 18.4. The CVD numbers are far
  better and the worst case across every condition is 7.9 against at best 2.5
  for any reference, so the trade looks right; but "we beat the references on
  plain minimum ΔE" is no longer the comfortable claim it was, and the paper
  should lead with the worst-case-across-conditions number instead.

## Done since the first draft

- **Palettailor comparison**, **Colorgorical cross-scoring** and
  **color-buddy validation** — above.
- **Human component.** Stated as out of scope in `bench/readme.md` (Caveats)
  and in the package readme's introduction, with the three human-grounded
  systems named.
- **Name difference.** `category-colors/evaluators/names` implements Heer &
  Stone name difference (`1 - cosine` of term-count vectors) as an evaluator,
  and the benchmark scores every palette's closest-named pair. The first
  draft's claim that the data was "largely in the repository" was wrong: the
  saliency table is one scalar per voxel, and name difference needs the full
  term matrix, which `bench/buildNameData.js` now builds from the c3
  repository with a documented 2% truncation (max deviation 0.03 from the
  full model).
- **Brettel vs Machado.** Noted in both the readme and the essay.
