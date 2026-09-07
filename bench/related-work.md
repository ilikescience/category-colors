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

**QualPal** [larsson2025qualpal] maximises the **minimum** pairwise distance
over a sampled HSL box, with optional protan/deutan/tritan adaptation. It
selects rather than searches, and it is deterministic. Two things make it the
most important comparison in this list: its objective is exactly the statistic
this benchmark reports as the headline number, and it is the only other system
here that can be asked to protect against colour vision deficiency at all. It
is also the most available: on PyPI, CRAN and the web, MIT as C++ and
Python, GPL-3 as the R package. It has no
luminance or grayscale term, so print is outside its scope. Measured below.

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

ColorBrewer [harrower2003colorbrewer], Tableau, d3, Observable, Carbon and
Okabe-Ito [okabe2008cud] are the benchmark's comparison set. Most were designed
under constraints the benchmark does not model, which `bench/readme.md` states.
Okabe-Ito is the exception and the one that matters: it was built to stay
legible under color vision deficiency, which is the axis this library claims.
See "The comparison that matters" below.

## Where this library actually sits

The honest read: **optimization-based categorical palette generation is a
populated field, and simulated annealing over a multi-term colour objective is
already published** (Palettailor). A paper claiming "we apply simulated
annealing to categorical palette generation" describes prior art.

What is plausibly distinctive, in rough order of strength:

1. **CVD robustness as weighted objective terms rather than constraints.** The
   default config carries five JND terms: unimpaired at weight 1, protanopia,
   deuteranopia and tritanopia at 0.1 each, and grayscale at 0.05. Petroff and
   QualPal both treat CVD as something to satisfy — a constraint and a
   simulation-before-selection respectively; here it is a cost to trade off,
   which is why the weights can be tuned against measurement rather than set
   once. **The grayscale term is the part with no equivalent anywhere in the
   comparison set**, and it is the one that survives contact with QualPal.
   Claim the print axis, not CVD in general.
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
automated search possible, and discrete rules are what make guarantees and
explanations possible. Running generated palettes through color-buddy and
reporting the results, failures included, is a stronger move than arguing with
it.

An earlier draft of this section called color-buddy "the natural independent
validator for this library's output". That was wrong, and the mistake is worth
keeping visible: its rules then prompted a change to the default CVD weights,
at which point it stopped being independent of the design. See "What a
different model and threshold say" below for what it can and cannot support.

## Palettailor, measured

`node bench/run.js --palettailor` runs Palettailor's own library headlessly on
the same seeds (see `bench/palettailor/readme.md` for how it is fed data it
was never designed to run without). At 8 colours, ten trials, seed 1:

- **Palettailor still wins on plain minimum ΔE**, 26.6 ± 2.4 against 22.6 ± 1.6.
  The gap narrowed sharply when the 3.0 defaults relaxed the CVD weights, but
  it did not close, and part of what remains is a difference of search spaces
  rather than search methods: Palettailor works lightness 35–95 at any chroma
  while this config works a mid-range okhsl box. State it plainly rather than
  burying it.
- **It loses the moment any deficiency is simulated.** Worst case across every
  condition: 1.2 ± 1.1 against 7.7 ± 0.3. Under deuteranopia 5.8 against 16.3,
  protanopia 9.2 against 14.9, tritanopia 10.5 against 15.6, grayscale 1.2
  against 7.7. Palettailor has no CVD term at all, and its numbers sit among
  the hand-designed reference palettes.
- **On name difference the two are now level**, 0.34 ± 0.16 against 0.35 ± 0.14.
  This is new, and it is a side effect rather than an achievement: 2.0.1
  measured 0.16 here and the 3.0 reweighting lifted it without a `names` term
  in the objective at all. Spreading colours further apart in ΔE tends to move
  them apart in naming too. Do not claim it as a designed property, and note
  that `--names 0.5` remains the way to optimize it deliberately.

Two further caveats: Palettailor's annealing schedule accepts nearly every move
for the first 60% of its run, so it is closer to a short hill-climb than to the
annealing this library does; and it is data-dependent, so a benchmark with no
data hides the advantage it was actually built for — spending contrast on the
classes that touch. See the runner's readme.

## QualPal, measured

`node bench/run.js --qualpal` runs QualPal (Larsson) through its Python
package. It is the most important comparison here and the least comfortable
one. See `bench/qualpal/readme.md` for the runner, including why it bypasses
the documented Python class.

It is not a search. QualPal selects the *n* most mutually distant colours from
a sampled HSL box, maximising the minimum pairwise distance — which is exactly
the statistic this benchmark reports as its headline number. It is also
deterministic: one configuration gives one palette, so its rows are single
values with nothing averaged.

Both reported configurations use QualPal's own default colorspace and differ
only in whether CVD adaptation is on, so the gap between them measures that
one thing:

| | min ΔE | worst deficiency | grayscale | worst of all six |
| --- | --- | --- | --- | --- |
| category-colors 3.0 | 22.6 ± 1.6 | 13.7 ± 2.0 | **7.7 ± 0.3** | **7.7 ± 0.3** |
| qualpal, CVD on | 24.7 | **21.8** | 0.9 | 0.9 |
| qualpal, CVD off (ships) | **39.6** | 7.3 | 1.2 | 1.2 |

- **QualPal beats this library on plain separation and on deficiencies, and it
  is not close on either.** 24.7 against 22.6, and worst deficiency 21.8
  against 13.7 — a 60% margin. Every one of our ten trials, from 9.9 to 16.1,
  falls below its 21.8. There is no reading of these rows in which this library
  is the better tool for colour vision deficiency, and any draft that implies
  otherwise is wrong.
- **What it does not do is print.** Grayscale 0.9 with CVD on, 1.2 without,
  against 7.7 here. QualPal's CVD options are protan, deutan and tritan; it has
  no luminance term, so nothing in it defends the one condition a photocopier
  applies. Turning its CVD adaptation on makes grayscale slightly *worse*
  (1.2 to 0.9), because separating under three dichromacies spends the same
  lightness budget that grayscale needs.
- **The claim reduces to one axis.** Worst pair across all six conditions:
  7.7 against 0.9 and 1.2. That gap is real and large, and it comes entirely
  from the grayscale term. Say "print", not "accessibility".
- **Its defaults are permissive, not conservative.** The default box is the
  whole HSL cube, so QualPal will return near-black and near-white; that is how
  it reaches 39.6. The same freedom gives it the worst WCAG contrast in the
  benchmark, 1.13 against white, and a minimum name difference of 0.10 with CVD
  on — two of its eight colours get the same name.

An earlier version of this section reported QualPal in a search box matched to
this library's, which cost it nine points of worst deficiency (21.8 to 12.6)
and made this library look narrowly ahead on that axis. It never was. The box
remains a genuine confound in the other direction — QualPal's default cube is
far larger than the mid-range okhsl region searched here — and
`bench/qualpal/readme.md` carries all four cells. Name the confound; do not
resolve it by picking the box that flatters.

The honest summary: **QualPal is a better categorical palette generator than
this one on every axis it models, and the only thing it does not model is
print.** That is the claim that survives, and it is much narrower than
"accessibility". Write it that way before a reviewer does it for you.

## Colorgorical, cross-scored

`node bench/run.js --colorgorical` runs Colorgorical's original Python code in
Docker (`bench/colorgorical/readme.md`) and scores every palette in the run on
its four criteria, each the minimum over pairs. Same run as above:

| | ΔE | name diff | pair pref | name uniq |
| --- | --- | --- | --- | --- |
| category-colors 3.0 | 22.7 ± 2.2 | 0.60 ± 0.09 | −50 ± 7 | 0.50 ± 0.09 |
| qualpal (CVD on) | 23.2 | 0.61 | −85 | 0.56 |
| qualpal (defaults) | 20.4 | 0.41 | −54 | 0.59 |
| palettailor | 26.6 ± 2.8 | 0.63 ± 0.13 | −67 ± 8 | 0.27 ± 0.10 |
| colorgorical (own samples) | 15.8 ± 3.2 | 0.45 ± 0.07 | −23 ± 9 | 0.41 ± 0.11 |
| best reference | 19.7 (observable10) | 0.70 (d3) | −13 (tableau20) | 0.59 (ColorBrewer) |

And the reverse direction, Colorgorical's ten 8-colour sample palettes at its
all-equal slider setting scored on this benchmark's metrics: minimum ΔE
15.8 ± 3.3 against 22.6 here, worst case across every simulated condition
0.9 ± 0.6 against 7.7 ± 0.3, and cosine name difference 0.09 ± 0.06 against
0.35 — its closest-named pair is usually two shades of the same name.

These scores have now moved twice with this library's defaults, in opposite
directions, which is worth stating rather than reporting only the current
row. Taking on the CVD terms in 2.0 pushed ΔE from 24.0 down to 18.6 and name
difference from 0.61 to 0.50 while improving pair preference and name
uniqueness; relaxing those weights in 3.0 moved ΔE back to 22.7 and name
difference to 0.60, and gave back most of the pair-preference and
name-uniqueness gains (−44 to −50, 0.57 to 0.50). **None of these four
criteria is in the objective.** They move as side effects of how far apart the
palette is spread, which is a reason to report them and not a reason to claim
them.

QualPal's row is the interesting one: it leads on ΔE and name difference and
posts the worst pair preference of anything measured here, −85. Maximising a
minimum pushes colours to the extremes of the box, and the extremes are not
where people say they like colours.

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

## What is being claimed, and on whose terms

The claim this work makes is narrow and should be stated in its own words
before anyone else states it for us:

> Given a just-noticeable-difference threshold of 20, CIEDE2000 distance in
> CIELAB D65, and Machado et al. (2009) as the color vision deficiency model,
> this optimizer produces eight-colour palettes whose **worst pair across
> unimpaired vision, five simulated deficiencies and a grayscale projection**
> is higher than that of any established categorical palette or any of the
> three published generators measured here.

That is the strongest form still standing, and it is deliberately not "better
palettes". Three things it does **not** claim, each because a measurement here
says otherwise:

- Not that it wins on plain separation. Palettailor (26.6) and QualPal (24.7
  with CVD on, 39.6 without) both beat it, and it leads Okabe-Ito only on the
  mean of ten trials.
- Not that it is the best on colour vision deficiency. QualPal is far better:
  worst deficiency 21.8 against 13.7, with all ten of our trials below its
  figure. **Grayscale is the only axis with a structural gap**, because no
  other system measured has a luminance term at all.
- Not that any of this is validated by a third party. See the color-buddy
  section: that tool has been an input to these weights twice.

Every part of that is a **choice**, not a discovery. The threshold comes from
Stone, Szafir & Setlur [stone2014engineering]; the distance metric from
[sharma2005ciede2000]; the deficiency model is culori's implementation of
[machado2009physiologically]. They are defensible and conventional, and they
are also ours. A reviewer's first move will be to ask whether the result is an
artifact of picking them, so the next two sections answer that directly rather
than waiting for the question.

## The comparison that matters: Okabe-Ito

Most reference palettes were never trying to survive color vision deficiency,
so beating them on it proves little. **Okabe & Ito's Color Universal Design
set was**, and it is the palette a reviewer will ask about first. It is in the
benchmark as `okabeIto`.

It is by some distance the best of the references:

| | min ΔE | worst deficiency | grayscale |
| --- | --- | --- | --- |
| category-colors 3.0 | 22.6 ± 1.6 | 9.9 to 16.1 | **7.7** |
| okabeIto | 21.3 | 8.8 | 0.4 |
| observable10 | 18.4 | 0.6 | 0.7 |
| tableau10 | 18.1 | 3.2 | 0.5 |
| d3category10 | 16.2 | 1.6 | 0.0 |
| colorBrewer3_10 | 13.7 | 1.9 | 0.1 |
| carbon | 12.8 | 5.0 | 2.5 |
| tableau20 | 12.6 | 0.6 | 0.8 |

Three readings. The first changed with 3.0 and the change should be described
carefully, because overstating it is the easiest mistake available here:

- **The optimizer now leads on plain minimum ΔE, on the mean.** 22.6 ± 1.6
  against 21.3. Through 2.0.x this comparison went the other way and the note
  here read "a hand-designed palette from 2008 beats the optimizer on the
  headline number". It no longer does — but **four of our ten trials land at or
  below 21.3** (20.7, 21.3, 21.3, 21.3), so the correct claim is that the
  distribution is centred above Okabe-Ito, not that a generated palette beats
  it. Anyone quoting a single run has a 40% chance of quoting a tie or a loss.
- **On the deficiencies the optimizer is ahead, and still without overlap.**
  Worst case across the five deficiency conditions, our ten palettes run 9.9 to
  16.1 against Okabe-Ito's 8.8. The floor moved down with the 3.0 reweighting —
  it was 12.5 — so the margin is now one trial wide at the bottom. It is worth
  saying that this was a deliberate trade and that the bottom of the range is
  where it shows.
- **Okabe-Ito is not safe in grayscale**, at 0.4. The collision is orange
  `#e69f00` against sky blue `#56b4e9`, two colors of nearly equal luminance,
  and it is not an artifact of the gray swatch: the seven chromatic colors
  alone score the same. Photocopy an Okabe-Ito figure and two categories merge.
  That is a real gap and it is the one this library's grayscale term closes,
  7.7 against 0.4. **This is the least contested finding in the whole
  benchmark** — no reference palette exceeds 2.5, and no other generator has a
  luminance term at all.

The honest summary is that this library now leads Okabe-Ito on average on
unaided separation and on every simulated condition, and that the grayscale gap
is the one large enough to carry an argument on its own.

## The result does not depend on the threshold

The evidence above is also threshold-free, which is worth making explicit.
Take each palette's **worst pair under any simulated condition** — the number
that decides whether a reader confuses two categories — over ten trials at
eight colors:

| | worst pair per palette, sorted |
| --- | --- |
| category-colors 3.0 | 7.2 7.3 7.5 7.6 7.7 7.8 7.8 7.9 7.9 8.0 |
| qualpal, CVD on | 0.9 (deterministic) |
| palettailor | 0.2 0.2 0.3 0.4 0.4 1.3 1.6 1.6 2.6 3.4 |
| colorgorical | 0.2 0.3 0.5 0.8 0.8 0.9 1.0 1.1 1.1 2.6 |
| qualpal, defaults | 1.2 (deterministic) |

**The distributions do not overlap.** Any cutoff between 3.4 and 7.2 separates
this library from everything else measured, so the ranking survives any
reasonable choice of threshold, including one chosen by someone hostile to it.
This is the *only* measurement on which QualPal does not lead, and it is
carried entirely by the grayscale condition: across the five deficiencies alone
QualPal's floor is 21.8 against our 9.9. Ten of ten Palettailor palettes and ten of ten
Colorgorical palettes contain a pair below ΔE 5 under some condition; eight
and nine of ten respectively fall below 2, which is two colors nobody can tell
apart. None of ours falls below 7.

This is also the number to quote rather than a count of failing pairs, because
a count says something different and weaker. Counting pairs below 20, out of
280, this library and Palettailor are effectively tied: 14% against 12% under
deuteranopia, 13% against 11% under protanopia, and both are now at 0% with no
simulation at all. Palettailor's palettes are more spread out on average and
catastrophic in the tail. Ours are tighter on average with no catastrophic
pair. QualPal with CVD on posts the best counts of anything measured — 0%, 0%
and 4% — but from a single palette of 28 pairs rather than 280, so the number
carries far less weight than the others in this paragraph. Since a palette fails on its worst pair, the tail is what
matters — the same reason the benchmark reports minima rather than means.

## What a different model and threshold say

`bench/colorbuddy` runs color-buddy's published lint rules, which make
different choices than we do: a threshold of 9 rather than 20, and an
LMS-matrix dichromacy model from `@bjornlu/colorblind` rather than Machado.
Under those different choices the ranking is the same, but **the 3.0
reweighting cost real ground here and it should be reported, not buried**:

| rule | 2.0.1 | 3.0 |
| --- | --- | --- |
| Protanopia-friendly | 10/10 | 10/10 |
| Deuteranopia-friendly | 10/10 | **8/10** |
| Tritanopia-friendly | 10/10 | **8/10** |
| Right in black and white | 0/10 | 0/10 |

No reference palette passes more than one dichromacy rule, and Palettailor
passes protanopia three times in ten and deuteranopia once, so the ordering is
unchanged. But two of ten generated palettes now fail rules that all ten passed
before. Under our own model and threshold the same trade looks almost free
(worst case across conditions moved 7.9 to 7.7); under color-buddy's threshold
of 9 and a different simulation model it costs two palettes in ten on two
rules. **That divergence is the most useful thing this runner has produced**,
because it shows the relaxation is closer to the edge than our own numbers
suggest. If the deficiency margin matters more than the 3.6 points of ordinary
separation 3.0 bought, the sweep behind that change found settings around
`jnd 0.7 / dichromacy 0.15 / tritanopia 0.05` that keep worst-deficiency near
14 for about a point and a half less unimpaired separation.

**This is not independent validation, and must not be presented as such.**
An earlier run of this same lint is what prompted re-examining the CVD weights
in 2.0, and the weights have since been tuned twice against measurements this
project chose. The tool is therefore an input to the design, not a check on it.
What it can honestly support is narrower: that the *ranking* is not an artifact
of our particular threshold or simulation model, since a different pair of both
orders the palettes the same way. Disclose the sequence, in the paper, before a
reviewer finds it in the commit history.

Two of its rules this library fails, and they are worth reporting:

- **`cvd-friendly-grayscale` is unreachable**, not merely failed. It requires
  every pair to differ by more than 9 after a grayscale projection. Adding a
  grayscale term lifted our own grayscale minimum from 0.8 to about 7.7, and
  it plateaus there at any weight: eight colors cannot be spread far enough in
  lightness alone while the other terms hold. The references sit between 0.0
  and 2.5, with two of `d3category10`'s colors identical in grayscale, so the
  palette is unusable in print.
- **`fair-nominal` fails, and the conflict is genuine.** It wants a lightness
  range under 50, and spreading lightness is how the CVD and grayscale terms
  buy separation. Its own message concedes it "is naturally at odds with color
  vision deficiency friendly palettes". Adding the grayscale term did flip
  `even-colors-lightness` from 1/10 to 10/10: the spread is now even, just wide.

Several of its rules are frank matters of taste (`avoid-green`,
`ugly-colors`, `require-color-complements`), its pass count does not rank
palettes at all — a control of eight near-identical colors fails only 13 of 29
applicable rules against 9 for the best reference — and thirteen of its 38
rules either never apply to an untagged categorical palette or pass vacuously.
`bench/colorbuddy/readme.md` has the details. None of that is a criticism of
color-buddy, which was built as a design probe about linter interfaces rather
than as a scoring system, and should not be cited as one.

## What the benchmark still needs

- **A manual pass on the three citations with no DOI**, named in the header
  of `references.bib`.
- **Decide whether 3.0's weights are where the paper wants to stand.** They
  buy 3.6 points of unimpaired separation (19.0 to 22.6) for 0.2 of worst-case
  (7.9 to 7.7) on our own measurements — but two of ten palettes now fail
  color-buddy's deuteranopia and tritanopia rules, which all ten passed at
  2.0.1, and all ten fall below QualPal on worst deficiency. The trade still
  looks right, and the paper should lead with worst-case-across-conditions
  either way, but the argument is now "we chose a point on a frontier" rather
  than "this is free". Say which, and show the frontier.
- **A QualPal sensitivity pass.** Its numbers come from one deterministic
  palette per configuration. Varying `colorspace_size` and the box would show
  whether 24.7 is a stable property or a lucky grid, and it is the first thing
  a reviewer who knows the tool will ask.
- **Resolve the `qualpalr` citation.** `references.bib` carries a CRAN package
  DOI; CRAN also advertises a preferred citation that has not been read yet.
- **Petroff and CatPAW are still unmeasured.** Petroff is the closer gap: it
  optimizes grayscale explicitly, which is the one axis this work is now
  claiming, so it is the strongest untested threat to the central claim.

## Done since the first draft

- **QualPal comparison** (`bench/qualpal`), in two configurations, after
  finding that its Python package silently drops every option including `cvd` —
  see that runner's readme. It is the strongest competitor measured and it
  narrowed the claim to the print axis.
- **The default CVD weights relaxed in 3.0**, on the measurement that they had
  saturated: worst case is pinned to grayscale in every configuration, so the
  red-green terms were defending a margin nothing was contesting.
- **Palettailor comparison**, **Colorgorical cross-scoring** and a
  **color-buddy run**, reported as a robustness check under a different
  threshold and simulation model rather than as validation — above.
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
