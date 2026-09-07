# CatPAW samples

Palettes from CatPAW (Tseng, Wang, Quadri & Szafir, CHI 2026), captured from
the authors' web tool so the benchmark can score them alongside everything
else. `samples.json` holds five eight-colour palettes and the settings that
produced them.

> Tseng, C., Wang, A. Z., Quadri, G. J. and Szafir, D. A. *Redundant is Not
> Redundant: Automating Efficient Categorical Palettes Design Unifying Color &
> Shape Encodings with CatPAW.* CHI 2026. `tseng2026catpaw` in
> [references.bib](../references.bib).

## Why there is no runner here

Every other generator in `bench/` runs headlessly: Palettailor from its own
sources, Colorgorical from its own Python in Docker, QualPal from PyPI. CatPAW
cannot, for two reasons.

There is no code release. The paper links a web tool
(<https://catpaw-categorical-palette.web.app/>) and an anonymised OSF page; it
does not publish an implementation. The tool's client-side JavaScript could be
scraped, but it is heavily coupled to the DOM — its logic reads and writes
jQuery selectors throughout — so running it outside a browser would mean
reimplementing the selection, and the benchmark would then be measuring the
reimplementation.

And it is slow. One eight-colour generation takes roughly 40 to 70 seconds in
the browser, with no seed and no batch mode.

So these five palettes were captured by hand: open the tool, tick
**Color-only**, set categories to **8**, press **Generate**, and read the
`fill` off the eight output swatches. Repeat. The recorded values are exactly
what the tool returned.

## What this sample is not

**Five is not ten, and none of it is seeded.** Every other generator here is
reported over ten trials from a known seed, reproducible exactly. These five
are a hand-collected convenience sample from a tool with no seed control.
Treat the spread as indicative and do not quote a standard deviation from it
without saying how it was obtained.

**CatPAW is stochastic.** Five presses gave five distinct palettes, so a single
capture would say very little.

**It selects from a fixed pool.** The output element ids index into the 39
CIELAB colours in the tool's `colors.js` — the set used in the authors'
crowdsourced experiments. CatPAW cannot return a colour outside that pool in
this mode, which bounds how far apart its palettes can be by construction.

## The category error to avoid

**Scoring CatPAW on perceptual distance measures it on an axis it does not
claim, and the numbers should never be quoted without that sentence attached.**

Its model is built from four crowdsourced experiments on *task accuracy* for
categorical encodings, and its central finding is that **redundant colour-and-
shape** encoding beats either channel alone, particularly at five to eight
categories. Colour-only is the mode its own paper argues against. A palette
that scores modestly on ΔE here may be doing exactly what CatPAW selected it
to do: support accurate class-level judgements when paired with a shape.

This benchmark has no shape channel and no measure of task accuracy, so it
cannot evaluate the thing CatPAW optimizes. What it can honestly say is how
CatPAW's colour-only output behaves under the distance and simulation choices
used throughout this directory — which is a statement about this benchmark's
terms, not a verdict on the tool. `related-work.md` states it that way.
