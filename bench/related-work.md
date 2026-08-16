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
[machado2009physiologically] for CVD simulation — note the essay cites Brettel
et al. [brettel1997computerized], but culori implements Machado, so the essay
and the code currently disagree; Stone, Szafir & Setlur [stone2014engineering]
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

## What the benchmark still needs

- **Colorgorical cross-scoring.** Its `Model.scorePalette(palette, weights)`
  scores an arbitrary palette on its four criteria, so generated palettes can be
  measured on their metrics without reimplementing the C extension.
  `python run.py --makeSamples` batch-generates 66 palettes without the web
  server. Both need a Python 2.7 environment; Docker is the sane route. Scoring
  each generator's output on *both* metric sets is the comparison a reviewer
  wants — winning only on home metrics proves nothing.
- **Palettailor comparison**, or an explicit statement of why it is out of
  scope. Given it is the same algorithm on the same problem, silence reads as
  not having looked.
- **A human component, or an explicit disclaimer.** Colorgorical, CatPAW, and
  Petroff all ground part of their objective in human ratings. This library
  optimizes only measurable quantities and says nothing about preference. That
  is a defensible scope, but it has to be stated rather than left for a reviewer
  to notice.
- **Name difference / name uniqueness terms.** The saliency table already
  carries the Heer & Stone model, so the data for a name-difference evaluator is
  largely in the repository. Adding it would make the objective directly
  commensurable with both Colorgorical and Palettailor.
