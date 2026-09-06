# Palettailor runner

Runs Palettailor (Lu et al. 2021, *Palettailor: Discriminable Colorization
for Categorical Data*) headlessly so the benchmark can score its palettes on
the same measurements as everything else.

```sh
node bench/palettailor/run.js --colors 8 --trials 3 --seed 1
```

Prints a JSON array of palettes (one hex array per trial) on stdout and the
time per palette on stderr. Trial *i* uses `seed + i`, matching `bench/run.js`.
From code:

```js
import { generatePalettailor } from './bench/palettailor/run.js';
const colors = await generatePalettailor({ colorCount: 8, seed: 1 });
// optional: weights = [1, 1, 1], background = '#ffffff'
```

The function is async because the first call may download the sources (see
below). The same seed always reproduces the same palette.

## Where the code comes from

The reference implementation is
[IAMkecheng/palettailor-library](https://github.com/IAMkecheng/palettailor-library),
pinned to commit `e18e334`. That repository has no licence file, so none of it
is vendored here. The runner downloads `d3.v4.min.js`, `d3.color.min.js`,
`palettailor.js` and `c3_data.json` from that commit into `.cache/` (gitignored)
the first time it runs, using Node's built-in `fetch`, and never touches the
network again while the cache is present.

Palettailor is a browser script: it expects d3 v4 and a global `d3_ciede2000`
to already exist, loads the Heer & Stone colour-name data with a synchronous
`XMLHttpRequest` at load time, and calls `alert()` when something is missing.
The three scripts are evaluated in order in one `node:vm` context with those
three things shimmed. `d3.color.min.js` replaces `d3.lab` with its own D65
implementation, which is why the order matters. The vm context has its own
`Math`, so its `Math.random` is replaced with the seeded generator from
`bench/seed.js`; seeding the host's `Math.random` would not reach it.

## Synthetic data

Palettailor is data-dependent: it takes the plotted points, builds a Voronoi
diagram, and weights each pair of classes by how often their points are
neighbours closer than about 35 px. Colours are then pushed apart in proportion
to those weights. This benchmark is data-agnostic, so the runner feeds
Palettailor 50 points per class scattered uniformly over a 400 × 400 area with
labels assigned round-robin. Every class borders every other (checked complete
at 8, 20 and 30 classes) and no pair is privileged, so the data term collapses
to roughly a mean pairwise ΔE.

That is the fairest input for a comparison without data, but it is not the
setting Palettailor was designed for. Its advantage on a real scatterplot, where
it can spend contrast on the classes that actually touch, is invisible here.
Half of its annealing moves swap two colours, which only matters when pair
weights differ; on this data those moves are almost no-ops.

## How Palettailor's constraints differ from this library

These are baked into `palettailor.js` and apply to every palette it returns:

- **Lightness 35–95** (CIELAB L via d3's `hcl`), and chroma clamped to 0–100.
  Palettes stay clear of near-black; this library's defaults do not impose
  either bound.
- **Excluded hue band.** During the repair loop, HCL hues 85–114 at lightness
  35–75 are pushed to 84 or 115, keeping olive and yellow-green out.
- **Minimum ΔE 10 repair loop.** After each perturbation, any pair closer than
  CIEDE2000 10 is re-perturbed up to 100 times before the candidate is scored.
- **Background term.** The minimum-distance term also includes each colour's
  distance from the background (white by default), so very light colours are
  penalised the way near-black would be at the other end.
- **Score.** `weights[0]` × data-weighted ΔE (normalised by the first random
  palette's value, so the scale differs per run) + `weights[1]` × mean
  pairwise name difference (1 − cosine of Heer & Stone term vectors) +
  `weights[2]` × 0.1 × minimum ΔE. The default is `[1, 1, 1]`.
- **Annealing.** Temperature starts at 100 000 and multiplies by 0.99 until it
  falls below 0.001: 1 834 iterations with one perturbation each. Score
  deltas are of order 1, so for roughly the first 1 100 iterations almost
  every move is accepted and the search is effectively a short hill-climb at
  the end.

Distances inside Palettailor use its bundled `d3_ciede2000` on its own Lab
conversion; the benchmark re-scores the returned hex strings with culori. The
repair loop can produce colours slightly outside sRGB mid-run; in 20 runs at
8 colours none survived to the final palette, and the runner clamps on the way
to hex regardless. A candidate whose rounded Lab misses the colour-name grid
scores NaN and is silently rejected (3 of 36 680 evaluations in those runs).

## Timing

Measured on an Apple Silicon laptop, one palette per line, after the context
has loaded (the first call adds about a second to parse the 1.6 MB name data):

| colours | time per palette |
| --- | --- |
| 4 | ~0.2 s |
| 8 | ~0.7 s |
| 12 | ~1.6 s |
| 20 | ~5 s |

Cost grows with the square of the palette size because every evaluation and
every repair pass compares all pairs.
