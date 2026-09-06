# Colorgorical cross-scorer

Scores any palette on Colorgorical's four criteria (Gramazio, Schloss &
Laidlaw 2017) by running the original Python 2.7 code and its C extension in
Docker. Nothing is reimplemented: `score.py` calls `Model.scorePalette` from
[connorgr/colorgorical](https://github.com/connorgr/colorgorical) at commit
`9064965` (14 Oct 2016, the last commit on master).

```sh
echo '[["#ff0000","#00ff00","#0000ff"]]' | bench/colorgorical/score.sh
bench/colorgorical/score.sh --samples --seed 1 > bench/colorgorical/samples.json
```

`score.sh` builds the image `colorgorical-scorer` on first use (a few minutes,
about 1 GB of downloads) and pipes stdin and stdout through the container.
The image is pinned to `linux/amd64`, the only platform PyPI still carries
Python 2.7 wheels for numpy, scipy and scikit-learn; on Apple silicon Docker
runs it under emulation, which is fine for scoring and slow for `--samples`.

## The scores

`Model.scorePalette(palette, weights)` scores every pair in the palette with
the C ufunc `numpyColorgorical.score`, then reports the **minimum** over
pairs for each criterion, multiplied by that criterion's weight. The weights
do nothing else here; `score.py` passes all four as 1 so the output is the
raw minimum. (Inside the generator the same weights are the slider
importances: candidate colours are ranked by the weighted sum of the four
scores, with CIEDE2000 and pair preference first rescaled to [0,1] using
bounds precomputed over the 8,325-colour grid.)

| Key | Criterion | Source | Range | Meaning |
| --- | --- | --- | --- | --- |
| `de` | perceptual distance | CIEDE2000 | roughly 0 to 120 | ΔE of the closest pair. Higher is better. |
| `nd` | name difference | Heer & Stone 2012 data | 0 to 1 | Hellinger distance between the two colours' XKCD name-count distributions, `sqrt(1 - Σ sqrt(p_a · p_b))`, for the most similarly named pair. Higher is better. This is **not** the `1 - cosine` name difference Heer & Stone define and Palettailor and `category-colors/evaluators/names` use, so it is not comparable with the benchmark's `minNameDifference`; both come from the same term counts. |
| `pp` | pair preference | Schloss & Palmer 2011 regression | about -101 to 108 | Predicted preference for the least-liked pair. Higher is better. |
| `nu` | name uniqueness | Heer & Stone 2012 | 0 to 1 | 1 minus normalised name entropy, for the least nameable colour. Higher means a colour people name consistently. |

Per-palette output:

- `input`: the hex strings given.
- `lab`: the CIELAB D65 colours actually scored (see caveats), `scored`: their hex.
- `min`: the four scores above.
- `pairs`: `de`, `nd`, `pp` for every pair, by index into `lab`.
- `nu`: name uniqueness per colour.

## `--samples`

Reproduces the palette-making half of `python run.py --makeSamples`
(`src/makeSamples.py`), without the matplotlib figures and LaTeX it also
writes. That is 20 slider settings (every combination of 0, 0.5 and 1 for
perceptual distance, name difference and pair preference, minus the ones the
authors deemed redundant; name uniqueness is always 0) × palette sizes 3, 5
and 8 × 10 distinct palettes each, where each palette is the best of 10 runs
of `Model.make` by lowest pair preference. 600 palettes in total.
`--repeats` and `--sizes` shrink it. `run.py`'s help text says 66 settings;
the code makes 20, and so does the `examplePalettes/README.md`.

`samples.json` holds one run with `--seed 1`.

## Caveats

- **Colours must sit on Colorgorical's grid.** Name difference, name
  uniqueness and pair preference are table lookups over the 8,325 CIELAB D65
  colours of Heer & Stone (multiples of 5 on each axis, inside sRGB). An
  off-grid colour reads table index -1, which in C is an out-of-bounds read,
  not an error. `score.py` converts hex to Lab with Colorgorical's own
  `convert.convertRGBToLab`, rounds each axis to the nearest 5 (what the web
  tool's score handler does), and if that rounded point is not in the table
  snaps to the nearest grid colour by Euclidean Lab distance instead. So the
  scores describe a quantised version of the input; `lab` and `scored` show
  what was measured. Expect saturated primaries to move by several ΔE.
- **Duplicate colours after snapping** score `de` 0 and `nd` 0, as they would
  in Colorgorical.
- **`de` is CIEDE2000 from Colorgorical's own C implementation**, so it is
  directly comparable to `minDeltaE` in `bench/run.js` only up to
  implementation differences and the grid snapping above.
- **Sampling is nondeterministic** unless `--seed` is given; it seeds
  `numpy.random`, which is the only randomness `Model.make` uses. A seeded run
  is reproducible for a given image build.
- **Palettes with 0 or 1 colours** make `scorePalette` return `0`, which
  `score.py` does not special-case.
