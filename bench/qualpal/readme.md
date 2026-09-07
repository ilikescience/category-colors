# QualPal runner

Runs QualPal (Larsson) so the benchmark can score its palettes on the same
measurements as everything else.

```sh
node bench/qualpal/run.js --colors 8            # CVD on, search box matched
node bench/qualpal/run.js --colors 8 --no-cvd   # QualPal's own defaults
```

From code:

```js
import { generateQualpal, QUALPAL_DEFAULT_BOX } from './bench/qualpal/run.js';
const colors = generateQualpal({ colorCount: 8 });
```

## Where the code comes from

QualPal is C++ with a Python package on PyPI, an R package (`qualpalr`) on
CRAN, and a web front end at <https://qualpal.cc>. Licensing differs by
artifact: the C++ sources and the Python package built from them are MIT, and
the R package is GPL-3. The benchmark uses the Python package. The runner
installs `qualpal==1.1.0` into a virtualenv under `.cache/` (gitignored) on
first use and never touches the network again. The version is pinned because
the option plumbing has changed between releases, and because of the bug below.

It is not the same kind of tool as the others here. Palettailor and this
library search; QualPal **selects**, taking the *n* most mutually distant
colors from a sampled grid over an HSL box, maximising the minimum pairwise
distance. That objective is the one this benchmark reports as `minDeltaE`,
which makes it the most directly comparable system in the set.

## It is deterministic, so there is no distribution

QualPal takes no seed and returns the same palette for the same arguments every
time. Where the other generators are reported as mean ± sd over `--trials`
independent runs, QualPal contributes exactly one palette per configuration.
Its rows in the results are single values; nothing is being averaged, and a
standard deviation of zero would be an artifact of that rather than a finding
about stability.

## The option plumbing is broken in 1.1.0, and this runner routes around it

**`generate.py` calls `_qualpal.generate_palette_unified` directly rather than
the documented `qualpal.Qualpal` class. That is not a shortcut.**

In qualpal 1.1.0 the Python class accepts `cvd`, `metric` and `background`,
validates them properly (it rejects an unknown metric, an unknown CVD key, and
a severity outside 0–1), stores them, and reads them back — and then calls C++
entry points whose signatures accept none of them:

```
generate_palette(n, h_range, c_range, l_range)
generate_palette_from_colors(n, colors)
```

So every setting produces a byte-identical palette. The clearest symptom is
that `min_distance` reports the same value under `ciede2000`, `din99d` and
`cie76`, which those scales cannot all produce for one palette. Asking for
`deutan: 1.0` on a pool containing a red and a green returns the same selection
as asking for nothing.

`generate_palette_unified` takes the full option set and honours it. Because a
silently ignored option would produce plausible-looking numbers rather than an
error, `generate.py` verifies on every CVD run that the palette actually differs
from the same box generated without CVD, and fails loudly if it does not. If a
future version fixes the class, that guard is what will keep this honest;
switching to the public API is then a one-line change.

Report the version with any QualPal number from this benchmark. Numbers taken
through the documented Python class in 1.1.0 are CVD-off numbers no matter what
was requested.

## The two configurations, and why both

| | search box | CVD |
| --- | --- | --- |
| `qualpal` | QualPal's own default | protan, deutan, tritan at severity 1 |
| `qualpal-defaults` | QualPal's own default | off |

**Both rows use the same box and differ only in CVD**, so the gap between them
measures that one thing. An earlier version of this runner varied the box as
well — CVD-on in a box matched to this library's, CVD-off in a narrow pastel
box taken from the R package's documentation — and then described the
difference as what CVD adaptation buys. It was mostly the box, and the pastel
box is not any version of QualPal's default. Both errors understated QualPal.

The default is the whole HSL cube, `h 0–360, s 0–1, l 0–1`, read from the
installed Python source rather than from documentation. That is worth stating
because it is unusually permissive: QualPal at its defaults will happily return
near-black and near-white, which is how it reaches a minimum ΔE of 39.6 at
eight colours. Those are real distances and a real palette; they are also why
its WCAG contrast numbers are the worst in the benchmark.

## The search-box control

The box is a confound in any comparison against this library, which searches a
mid-range okhsl region. Measured at 8 colours, all four cells:

| box | CVD | min ΔE | worst deficiency | grayscale | worst of all six |
| --- | --- | --- | --- | --- | --- |
| QualPal default | off | 39.6 | 7.3 | 1.2 | 1.2 |
| QualPal default | on | 24.7 | 21.8 | 0.9 | 0.9 |
| matched to this library | off | 35.0 | 4.5 | 0.2 | 0.2 |
| matched to this library | on | 23.7 | 12.6 | 5.2 | 5.2 |

Two things fall out that the headline rows alone would hide. **CVD adaptation
costs plain separation and buys deficiency headroom** — 39.6 to 24.7 in
exchange for 7.3 to 21.8 — which is the same trade this library makes with its
CVD weights, made by a different mechanism. And **constraining the box to this
library's range is not neutral**: it costs QualPal nine points of worst
deficiency (21.8 to 12.6) while raising its grayscale (0.9 to 5.2), because a
mid-range box has less lightness to spend and less room to separate under
simulation. Neither box is the fair one. Report the tool's own default and
name the confound.

`node bench/qualpal/run.js --matched-box` and `--no-cvd` set the two axes
independently, which is what makes the table above reproducible.

## What QualPal cannot be asked to do

Its CVD options are `protan`, `deutan` and `tritan`. There is no grayscale or
luminance term, so the `grayscale` condition in the results — the print and
photocopy stand-in — is the one condition it has no way to optimize for. That
is a scope difference, not a defect: nothing in its documentation claims print.
