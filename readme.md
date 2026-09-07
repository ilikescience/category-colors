# category-colors

Generate color palettes for categorical data visualization using simulated annealing.

Categorical palettes have to satisfy several goals at once: every pair of colors
must be tellable apart, they must stay tellable apart for viewers with color
vision deficiency, they may need to hit a contrast ratio against the chart
background, and they should look like they belong together. These goals
conflict, so there is no palette that maximizes all of them. This library treats
palette design as an optimization problem instead: you weight the goals you care
about, and simulated annealing searches for the least-wrong compromise.

This is the code behind the essay
[How to pick the least wrong colors](https://mattstromawn.com/writing/how-to-pick-the-least-wrong-colors/).

The essay's color-blindness images were made with Brettel, Viénot, and Mollon's
1997 simulation; the code has since moved to Machado, Oliveira, and Fernandes's
2009 model, via culori (see [Credits](#credits)).

Every evaluator measures something computable: perceptual distance, contrast,
simulated color vision deficiency, name overlap. None of them measures whether
people like a palette or whether its colors suit what they label, so the
result is a starting point to test with the people who will read it, not a
finished design.

## Install

```bash
npm install category-colors
```

Requires Node.js 22.12 or newer. The package is ESM; on Node 22.12+ `require()`
loads it as well, so CommonJS callers work without a build step.

## Quick start

```js
import {
  createDefaultConfig,
  createDefaultState,
  prepareInitialState,
  runWithOrderOptimization,
} from 'category-colors';

const config = createDefaultConfig();
const initialState = prepareInitialState(createDefaultState(), config);
const finalState = runWithOrderOptimization(initialState, config);

console.log(finalState.colors.map(String));
// [ '#3b4755', '#cb5f8b', '#d9e5e8', ... ]
```

`prepareInitialState` fills the palette out to `config.colorCount`, clamps every
color into the working space, and picks a starting temperature by sampling
random mutations. `runWithOrderOptimization` anneals and then reorders the
result so neighboring swatches sit at even perceptual distances; use
`runSimulatedAnnealing` to skip the reordering.

## Command line

```bash
npx category-colors run
npx category-colors report '#ff0000' '#f10000' '#00ff00' --threshold 20
```

Run options:

| Flag | Meaning |
| --- | --- |
| `-c, --config <path>` | Module exporting config overrides or a factory |
| `-s, --state <path>` | Module exporting a colors array or state overrides |
| `-f, --format <type>` | `text` (default), `json`, or `palette` |
| `-o, --output <path>` | Write to a file instead of stdout |
| `--no-order` | Skip post-annealing order optimization |
| `--quiet` | Suppress progress logging |

Report options audit an existing palette for pairs that fall below a
just-noticeable-difference threshold:

| Flag | Meaning |
| --- | --- |
| `[colors...]` | Hex colors to audit when `--palette` is not used |
| `-p, --palette <path>` | Module exporting a colors array or state object |
| `-m, --method <name>` | Distance method (default `ciede2000`) |
| `--space <name>` | Distance space (default `lab65`) |
| `-t, --threshold <num>` | Flag pairs below this ΔE (default `25`) |
| `--cvd <type:severity>` | Add a CVD simulation, e.g. `deuteranomaly:0.5`. Repeatable |
| `--palette-space <space>` | Report colors in this space instead of hex |
| `-f, --format <type>` | `text` (default) or `json` |
| `-o, --output <path>` | Write to a file instead of stdout |

Config and state files may be ESM or CommonJS. They are loaded with `require()`,
so an ESM file using top-level await will not load.

## Entry points

| Import | Contents |
| --- | --- |
| `category-colors` | The optimizer, evaluators, config factories, color utilities, and the JND report |
| `category-colors/report` | `reportJndIssues` on its own |
| `category-colors/evaluators` | The evaluators, without going through the main barrel |
| `category-colors/evaluators/saliency` | The saliency evaluator alone, for loading its lookup table on demand |
| `category-colors/evaluators/names` | The name-difference evaluator and its helpers; not reachable from the main entry |
| `category-colors/cli` | `generatePalette` and the CLI's formatting helpers |

The main entry is browser-safe — nothing reachable from it imports a Node
builtin — and a test enforces that. The CLI helpers, which read files from disk,
are only reachable through `category-colors/cli`.

### Bundle size

The package is side-effect-free apart from one module, and says so in
`package.json`, so a bundler can drop whatever you do not import. The thing
worth knowing is that `saliency` carries a ~150 kB lookup table:

```js
import { energy, jnd } from 'category-colors';   // table dropped
import { evaluators } from 'category-colors';    // table included
```

Naming evaluators individually lets them be tree-shaken. Referencing the
`evaluators` object does not — a bundler cannot know which keys you index, so
it has to keep all of them. If you need the object for dynamic lookup but not
saliency, build your own from named imports. To defer the table instead of
dropping it, `await import('category-colors/evaluators/saliency')` keeps it out
of the initial chunk until something selects it.

The `names` evaluator's table is larger still, about 260 kB, so it is not in
the main entry at all: `category-colors/evaluators/names` is the only way to
load it.

## API

### Optimization

- `prepareInitialState(state, config)` — fill, clamp, score, and choose a starting temperature.
- `runSimulatedAnnealing(state, config)` — anneal until the cutoff temperature or iteration cap.
- `runWithOrderOptimization(state, config)` — anneal, then reorder for even adjacent distances.
- `cost(state, config)` — the weighted average of every evaluator's score.
- `costBreakdown(state, config)` — the same number itemized per evaluator, in `config.evalFunctions` order. Each entry is `{ weight, cost, weightedCost }`, and the `weightedCost` values sum to `cost(state, config)`.
- `simulateCvd(state, type, severity)` — a copy of the state with every color passed through a CVD filter.

### Configuration and data

- `createDefaultConfig()` / `createDefaultState()` — starting points to spread and edit.
- `evaluators` — every evaluator, as an object, for building `evalFunctions` dynamically. Also exported individually (`energy`, `range`, `jnd`, `similarity`, `avoid`, `contrast`, `saliency`). `names` lives only at `category-colors/evaluators/names`.
- `palettes` — established categorical palettes (`observable10`, `d3category10`, `carbon`, `tableau10`, `tableau20`, `colorBrewer3_10`) for comparison or as seeds.

### Color utilities

- `deltaE(a, b, options)` — perceptual distance between two colors.
- `createColor(input, coords?)` — normalize a hex string, culori object, or `{ color, lockedChannels }` spec into the color objects the optimizer uses.
- `getChannels(mode)` — the channel names of a color mode, in order.

### Recording a loss curve

Set `recordHistory` to collect a `[iteration, cost]` trace on the returned
state, which is what you need to plot convergence:

```js
const config = { ...createDefaultConfig(), recordHistory: true, historyInterval: 100 };
const finalState = runWithOrderOptimization(prepareInitialState(state, config), config);

finalState.costHistory; // [[0, 4.21], [100, 3.88], ..., [7412, 1.03]]
```

`historyInterval` defaults to `maxIterations / 250`. The first and last
iterations are always sampled, and order optimization appends one final point.

## Configuration

`config.evalFunctions` is an array of `{ function, weight, ...options }`
descriptors. Weights are relative — they are normalized against their sum, not
required to add to 1. Evaluator-specific options live on the descriptor rather
than on the top-level config, so the same evaluator can appear several times
with different settings:

- Raise the weight on `energy` to push colors further apart.
- Raise the weight on `range` to make the distances between colors more uniform.
- Add more `jnd` entries with different `cvd` settings to cover more deficiencies.
- Swap `similarity` or change `config.similarityTarget` to chase a reference palette.

### Color vision, and the trade it makes

The default `evalFunctions` carries four `jnd` terms under simulation:
protanopia and deuteranopia at weight 0.3 each, tritanopia at 0.2, and
grayscale at 0.1. They model full dichromacy rather than a milder anomaly,
because optimizing the harder case carries the milder one.

**This costs ordinary separation, on purpose.** Measured over ten seeds at
eight colors, against a configuration with no CVD terms beyond the previous
default:

| | before | after |
| --- | --- | --- |
| minimum ΔE | 23.8 | 19.0 |
| minimum ΔE, deuteranopia | 8.9 | 16.1 |
| minimum ΔE, protanopia | 11.7 | 16.2 |
| minimum ΔE, tritanopia | 10.6 | 17.2 |
| minimum ΔE, grayscale | 0.8 | 7.9 |

If you do not need that, raise the unimpaired `jnd` weight or drop the terms
you do not want, and the separation comes back:

```js
const config = createDefaultConfig();
// keep only the red-green deficiencies
config.evalFunctions = config.evalFunctions.filter(
  (entry) => !entry.cvd || /prot|deuter/.test(entry.cvd.type)
);
```

Two honest notes on what these numbers mean. The deficiency filters are
culori's, implementing Machado, Oliveira and Fernandes (2009); any CVD claim
is relative to the model that produced it, so name the model when you quote a
number. And `grayscale` is a luminance projection standing in for print or
photocopying, not a physiological model of achromatopsia. Its score also stops
improving past a weight of about 0.05, so pushing it harder only takes
separation from the other terms.

`config.colorDistance` chooses the distance method and the space it is measured
in (see the [culori distance docs](https://culorijs.org/docs/color-difference/)):

```js
const config = createDefaultConfig();

config.colorDistance = {
  method: 'cmc',
  space: 'oklab',
  cmc: { l: 2, c: 1 },
};
```

`config.colorSpace` controls the working space for initialization and mutation.
Each entry in `ranges` corresponds to a channel of the chosen mode, and cyclic
channels such as hue are detected automatically from the mode definition:

```js
config.colorSpace = {
  mode: 'okhsl',
  ranges: [
    [0, 360],   // hue
    [0.2, 0.8], // saturation
    [0.4, 0.9], // lightness
  ],
};
```

The annealing schedule itself:

- The starting temperature is derived by sampling random mutations.
  `initialTemperatureSamples` sets how many, and `initialAcceptanceRate` sets
  the probability of accepting a cost-increasing move at the start of the run.
- `coolingRate` multiplies the temperature each iteration. Closer to 1 cools
  more slowly and runs longer.
- `cutoff` is the temperature at which the run stops.
- `maxIterations` caps the run regardless of temperature.

## Channel locking

Lock channels to preserve some aspect of a color while letting the rest vary —
holding a brand hue fixed while saturation and lightness move to meet a contrast
requirement, for instance. Pass colors as objects with a `lockedChannels` array:

```js
const colors = [
  { color: '#ff0000', lockedChannels: [0] },    // lock hue
  { color: '#00ff00', lockedChannels: [0, 1] }, // lock hue and saturation
  '#0000ff',                                    // fully mutable
];
```

Channel indices follow the color space mode: `okhsl`/`hsl` is
`[0]=hue, [1]=saturation, [2]=lightness`; `oklab`/`lab` is `[0]=lightness,
[1]=a, [2]=b`; `rgb` is `[0]=red, [1]=green, [2]=blue`. Colors can also carry
`fixedColor` to exclude them from mutation entirely, or `fixedOrder` to pin them
in place during order optimization.

See [examples/channelLocking.js](examples/channelLocking.js).

## WCAG contrast

The `contrast` evaluator applies exponential penalties when colors fall below a
required ratio against a background, using culori's `wcagContrast()`:

```js
import { evaluators } from 'category-colors';

const config = {
  evalFunctions: [
    { function: evaluators.energy, weight: 0.2 },
    {
      function: evaluators.contrast,
      weight: 0.8,
      background: '#ffffff',
      ratio: 3,              // 3:1 non-text, 4.5:1 AA text, 7:1 AAA
      checkAdjacent: false,  // also check contrast between adjacent colors
    },
  ],
};
```

Combined with channel locking, this pulls brand colors into compliance while
keeping their hue. See [examples/wcagContrast.js](examples/wcagContrast.js).

## Avoiding specific colors

`avoid` is the inverse of `similarity`: it pushes the palette away from a set of
colors. Use it to keep categorical colors clear of a background, a brand color,
or semantic colors that shouldn't be confused with data.

```js
const config = {
  evalFunctions: [
    { function: evaluators.energy, weight: 0.2 },
    {
      function: evaluators.avoid,
      weight: 0.8,
      colors: ['#e74c3c', '#2ecc71'],
      radius: 0.15, // fraction of the metric's maximum distance
    },
  ],
};
```

Each color is charged for how far it has intruded into the radius around its
nearest avoid color — a linear ramp from 1 at an exact match to 0 at the radius
edge — and costs nothing outside every radius. Unlike similarity targets, avoid
colors are measured exactly as given rather than coerced into the working space,
since the point is distance from the actual color.

## Name difference

Two colors people would both call "blue" are confusable in a legend even when
they are far apart in ΔE. `category-colors/evaluators/names` scores that with
Heer & Stone's color-naming model, the same data behind `saliency`: the
evaluator returns the palette's mean pairwise name similarity, 0 to 1, and
slots into `evalFunctions` like any other.

```js
import { createDefaultConfig } from 'category-colors';
import names, { nameDifference, nameTerms } from 'category-colors/evaluators/names';

const config = createDefaultConfig();
config.evalFunctions.push({ function: names, weight: 0.5 });

nameTerms('#7c0000');
// [{ term: 'red', share: 0.26 }, { term: 'darkred', share: 0.16 }, { term: 'maroon', share: 0.16 }, ...]
nameDifference('#ff0000', '#0000ff');
// ≈ 1
```

`nameDifference(a, b)` is `1 - cosine` of the two colors' naming vectors: 0
for the same name, 1 for no term in common. It is the quantity Colorgorical and
Palettailor optimize, so adding `names` makes this objective comparable with
theirs. The shipped table keeps only terms carrying at least 2% of a color's
vector, which moves name difference by 0.002 on average and 0.03 at most
against the full model.

The sibling `saliency` evaluator reads the other half of the same model: how
consistently people name a single color, rather than how two colors differ. It
is a cost like every other evaluator, so it returns `1 - mean saliency` and
minimizing it pulls the palette toward prototypical, nameable colors. Colors
outside the model's sRGB grid have no naming data and cost the maximum.

```js
import saliency from 'category-colors/evaluators/saliency';

config.evalFunctions.push({ function: saliency, weight: 0.3 });
```

## Custom evaluators

An evaluator takes `(state, config, descriptor)` and returns a cost. Read your
parameters off the `descriptor` — the `evalFunctions` entry itself — so the same
function can be used several times with different settings, and normalize the
result so its contribution stays comparable to the others:

```js
import { converter } from 'culori';

const evaluateWarmness = (state, config, descriptor = {}) => {
  const { targetHue = 30, tolerance = 60 } = descriptor;
  const toHsl = converter('hsl');

  const cost = state.colors.reduce((sum, color) => {
    const hueDiff = Math.abs(toHsl(color).h - targetHue);
    return hueDiff > tolerance ? sum + ((hueDiff - tolerance) / 180) ** 2 : sum;
  }, 0);

  return cost / state.colors.length;
};

export default evaluateWarmness;
```

Exponential penalties (`(threshold / value) ** 4`) work better than linear ones
for hard requirements: they stay near zero while satisfied and rise steeply once
violated, which gives the annealer a clear gradient to follow.

## JND reporting

```js
import { reportJndIssues } from 'category-colors/report';

const result = reportJndIssues(['#ff0000', '#f20000', '#00ff00', '#0000ff'], {
  distanceMethod: 'ciede2000',
  distanceSpace: 'lab65',
  jndThreshold: 25,
  cvdSimulations: [
    { type: 'protanomaly', severity: 1 },
    { type: 'deuteranomaly', severity: 0.5 },
  ],
});
```

The result holds one test per condition — the base palette plus each requested
simulation. Every test carries `pairs` (all pairs, with distances) and `issues`
(the subset below the threshold, sharing the same objects). `totalIssues` sums
issue counts across tests, so a pair that fails under two simulations counts
twice.

`pairs` is O(n²) per test and dominates the serialized size of a report; pass
`includePairs: false` when you only need the failures. The CLI's `report`
command omits it by default and takes `--pairs` to include it.

## Development

```bash
npm test
```

Tests use the Node.js built-in runner; there are no dev dependencies. Beyond the
unit tests, the suite checks that every `exports` subpath resolves to a file
that ships, and that nothing reachable from the main entry imports a Node
builtin.

## Credits

The evaluators are built on published color science:

- **CIEDE2000** — Sharma, G., Wu, W., and Dalal, E. N. "The CIEDE2000 Color-Difference Formula." *Color Research & Application*, 2005. Used by every distance-based evaluator.
- **CVD simulation** — Machado, G. M., Oliveira, M. M., and Fernandes, L. A. F. "A Physiologically-based Model for Simulation of Color Vision Deficiency." *IEEE TVCG*, 2009, via culori's deficiency filters.
- **Just-noticeable difference** — Stone, M., Szafir, D. A., and Setlur, V. "An Engineering Model for Color Difference as a Function of Size." *Color and Imaging Conference*, 2014.
- **Saliency** — Heer, J. and Stone, M. "[Color Naming Models for Color Selection, Image Editing and Palette Design](https://vis.stanford.edu/color-names/)." *ACM CHI*, 2012. The `saliency` evaluator's lookup table is their 8,325-voxel CIELAB color-naming model, scoring how consistently people name each color; the `names` evaluator uses the same model's per-color term counts, from their [c3 repository](https://github.com/StanfordHCI/c3).

## License

MIT
