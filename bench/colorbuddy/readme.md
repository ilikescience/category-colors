# color-buddy lint runner

Runs [color-buddy](https://color-buddy.netlify.app)'s palette linter over a
palette and reports which of its rules pass and which fail.

> McNutt, A., Stone, M. and Heer, J. *Mixing Linters with GUIs: A Color Palette
> Design Probe.* IEEE TVCG (Proc. IEEE VIS), 2025. `mcnutt2025linters` in
> [references.bib](../references.bib).

Every rule here is color-buddy's. Nothing in this directory authors a rule, and
that is the entire point: `bench/metrics.js` and the optimizer's evaluators
were written by the same person, so they cannot independently confirm each
other. color-buddy is a third-party linter with its own thresholds, published
separately, and it either agrees with the benchmark or it does not.

```sh
node bench/colorbuddy/lint.js '#4e79a7' '#f28e2b' '#e15759'   # one palette
node bench/colorbuddy/lint.js --json '#4e79a7' '#f28e2b'      # structured output
node bench/colorbuddy/lint.js < palettes.json                 # many palettes
node bench/colorbuddy/lint.js --background '#111111' '#4e79a7' '#f28e2b'
```

With no positional arguments it reads JSON from stdin: an array of hex strings
(one palette), an array of hex arrays, or an array of
`{name, colors, background}` objects. `--space` sets the palette's color space
(default `lab`), `--background` the background (default `#ffffff`). The process
exits 1 if any error-level rule fails and 2 on bad input.

From code:

```js
import { lintPalette } from './bench/colorbuddy/lint.js';
const result = lintPalette(['#4e79a7', '#f28e2b'], { background: '#ffffff' });
// { colors, background, colorSpace, passed, failed, skipped, errored, counts }
```

`failed` entries carry the rule's `id`, `name`, `level`, `group`, `description`,
the linter's own `message`, and `blame`: the colors or color pairs the rule
points at. `skipped` entries carry the reason the rule did not apply.

## Which rules run

`PREBUILT_LINTS` from `color-buddy-palette-lint@0.0.8`, all 38 of them, run
against a `categorical` palette with no per-color tags. Nine never apply to
such a palette and are reported as skipped, not as passes:

- six affect rules (`saturated-serious`, `saturated-trustworthy`,
  `saturated-calm`, `light-blues-beiges-grays-playful`,
  `dark-reds-browns-positive`, `light-colors-greens-negative`) each require the
  palette to carry a mood tag the color-buddy GUI lets a designer set;
- `fair-sequential`, `diverging`, and `sequential-order` apply only to
  sequential or diverging palettes.

Four more pass vacuously, which is worth knowing before quoting a pass count.
`contrast-aa` and `contrast-aaa` check only colors tagged `text`,
`whisper-scream` only colors tagged `axis`, and `blue-basic-color-term` only
colors tagged `blue`. No color here carries a tag, so all four check an empty
set and pass. `too-many-colors` (fewer than 11) and `gamut-check` also pass for
any 8- or 10-color hex palette. That leaves roughly 25 rules doing real work.

## What the rules that fire actually check

Thresholds are read from each rule's own program, not inferred.

| Rule | Level | Check |
| --- | --- | --- |
| `contrast-graphical-objects` | error | Every color has WCAG 2.1 contrast > 3 with the background. |
| `contrast-aa-all` / `contrast-aaa-all` | error | The same, at > 4.5 and > 7. These are text thresholds applied to every swatch. |
| `cvd-friendly-deuteranopia` / `-protanopia` / `-tritanopia` | error | After simulating the dichromacy, every pair differs by more than 9. |
| `cvd-friendly-grayscale` | error | The same, in grayscale. |
| `mutually-distinct` | error | Every pair is more than 15 apart in CIELAB (Euclidean, not CIEDE2000). |
| `color-name-discriminability` | error | No two colors get the same name from color-buddy's namer. |
| `even-colors` | warning | Standard deviation of the gaps between sorted LCH hues is under 10. |
| `even-colors-lightness` | warning | The same for LCH lightness, under 5. |
| `fair-nominal` | warning | LCH lightness range under 50 and chroma range under 80, so no swatch dominates. |
| `cat-order-similarity` | warning | Neighbouring colors in palette order differ by CIEDE2000 > 10. |
| `Thin-` / `Medium-` / `Wide-discrim` | warning | Every pair clears a per-channel CIELAB threshold in L, a, or b. Thin marks want 12.58, 20.74 or 34.05; the wider sizes are looser. |
| `avoid-green` | warning | No color has an HSL hue between 90 and 150. |
| `require-color-complements` | warning | Some pair is within 5 degrees of complementary in HSL hue. |
| `avoid-tetradic` | warning | No color sits at 90, 180 and 270 degrees from others. |
| `ugly-colors` | warning | No color is within CIEDE2000 10 of five named "ugly" colors. |
| `extreme-colors` | warning | No color is exactly black, white, or primary red/green/blue. |
| `background-de-saturation` / `avoid-too-much-contrast-with-the-background` | warning | Properties of the background and of the colors against it. |

Several are frank matters of taste rather than measurements: `avoid-green`,
`require-color-complements`, `avoid-tetradic`, `ugly-colors` and
`even-colors` encode a designer's preference, and `fair-nominal`'s own failure
message says it "is naturally at odds with color vision deficiency friendly
palettes". A palette can be better for its purpose while failing them.

## Version and installation

`color-buddy-palette-lint@0.0.8` is a devDependency. `bench/` is excluded from
the npm tarball by the `files` field in `package.json`, so this never reaches
anyone installing `category-colors`.

Two things about the package are worth recording, because `lint.js` works
around both and neither is obvious from the README:

- **The published `exports` map is broken.** `files` publishes only `dist`,
  but `exports.default` points at `./src/main.ts`, which is not shipped. Both
  `import 'color-buddy-palette-lint'` and any subpath import fail. `lint.js`
  walks up to `node_modules` and imports the built bundle by path.
- **The bundle inlines its own copy of `color-buddy-palette` and colorjs.io.**
  A `Palette` built with the separately installed `color-buddy-palette` carries
  colors from a different color-space registry, and `color-name-discriminability`
  and `ugly-colors` then throw `sRGB (srgb) is not a valid color space` instead
  of running. Building the palette with the bundle's own `Color` class fixes
  both. `lint.js` recovers that class from a rule's own test fixtures. It also
  uses `Color.colorFromString` rather than `Color.colorFromHex`, because the
  latter memoizes on the hex alone and returns a cached color in the wrong
  space on any later call.

Two smaller caveats: the linter reports "this rule does not apply" and "this
rule threw" both as `kind: "invalid"`, so `lint.js` re-derives applicability to
separate `skipped` from `errored`; and the `colorSpace` option changes the
palette object but not any verdict, since the prebuilt rules convert to
whatever space they need.

## Does it agree with the benchmark?

Partly, and not in the way a pass count would suggest. Four palettes, 8 colors
each, on a white background, scored by `bench/metrics.js` and linted here. The
generated row is a single draw from a single seed, and some verdicts move with
the seed:

| Palette | min ΔE | min CVD ΔE | Failed | error / warning |
| --- | --- | --- | --- | --- |
| generated (`--trials 1`, seed 1) | 23.8 | 7.0 | 11 | 6 / 5 |
| `tableau10` first 8 | 18.1 | 3.2 | 9 | 7 / 2 |
| `colorBrewer3_10` first 8 | 13.7 | 1.9 | 10 | 7 / 3 |
| eight near-identical blues | 0.2 | 0.0 | 13 | 8 / 5 |

**Counting failures does not rank palettes.** A palette of eight nearly
identical blues fails 13 rules; a good reference palette fails 9. Ranking by
total failures would put `tableau10` first and the generated palette third,
and would place the deliberately terrible palette only four rules behind the
best one. Any writeup quoting "passes N of 38 color-buddy lints" as evidence of
quality is quoting a number that barely moves.

**The rules that carry the signal are the distance rules, and they do agree.**
Five rules fail on the near-identical palette and on nothing else:
`mutually-distinct`, `color-name-discriminability`, `Medium-discrim`,
`Wide-discrim`, and `cat-order-similarity`. All five are perceptual-distance
rules, all five are exactly what `minDeltaE` measures, and the generated
palette passes all five. `Thin-discrim`, the strictest of the size rules, fails
for the generated palette and for `colorBrewer3_10`, and passes for
`tableau10`. Its complaint about the generated palette is a disagreement about
formula rather than about the colors: `#e2d2ec` and `#d2e3c3` are 32.5 ΔE
apart, above the palette's own minimum of 23.8, but the rule wants one CIELAB
channel to clear its threshold alone and this pair splits the difference across
a and b.

**On CVD the linter confirms the specific claim.** `cvd-friendly-protanopia`
fails for `tableau10` (min ΔE 3.2 under protanopia), for `colorBrewer3_10`
(4.7), and for the near-identical palette, and passes only for the generated
palette (15.8). That is the CVD-as-objective-term claim in
[related-work.md](../related-work.md), validated by someone else's threshold.

**The CVD verdicts are not directly comparable to the benchmark's CVD column.**
Both simulate the same conditions, but with different models: the CVD rules run
color-buddy's own simulation, an LMS-matrix dichromacy model from
`@bjornlu/colorblind`, then require symmetric CIEDE2000 above 9 for every pair.
`bench/metrics.js` uses culori's Machado et al. filters. On the generated
palette the closest deuteranopia pair, `#613741` and `#486948`, measures 12.45
under Machado and 8.78 under color-buddy's model, so it clears the benchmark
comfortably and misses the rule's threshold by 0.22. A generated palette can
therefore pass or fail `cvd-friendly-deuteranopia` depending on the seed, and
the pass is worth less than the protanopia result, where the margin is wide.

**Five rules fail for every palette in the set**, good and bad alike:
`contrast-aa-all`, `contrast-aaa-all`, and the deuteranopia, tritanopia and
grayscale CVD rules. The two contrast rules demand that every categorical
swatch clear the 4.5:1 and 7:1 body-text thresholds against white, which no
palette designed for filled marks does. They are not evidence about a
categorical palette either way.

**Where the linter dislikes the generated palette is where the objective made a
trade.** It uniquely fails `even-colors-lightness` and `fair-nominal`, both of
which want a narrow lightness range. Spreading lightness is how the optimizer
buys separation under simulated CVD, and `fair-nominal`'s failure message says
as much. That is a real disagreement about priorities, not a bug in either
tool, and it belongs in the writeup as one.

The honest summary: color-buddy independently confirms that the generated
palette is mutually distinct, uniquely nameable, and protanopia-safe where the
references are not; it independently faults the palette for uneven lightness;
and its aggregate pass count is not a quality measure at eight colors.
