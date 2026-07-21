## How to pick the least wrong colors

This is the code to go along with the essay on my website, [How to pick the least wrong colors](https://matthewstrom.com/writing/how-to-pick-the-least-wrong-colors/).

It is a very unskilled implementation of the simulated annealing algorithm in service of creating color palettes for categorical data visualization.

It comes with an MIT License - please use it carefully and respectfully.

### Running

Use the bundled CLI to generate colors without editing project files:

```bash
npx categorycolors run
# or, from this repository clone:
node ./bin/category-colors.js run
```

Helpful flags:
- `--config path/to/config.js` – customize the annealing config (object export or factory).
- `--state path/to/state.js` – seed the initial palette (array export or override object).
- `--format text|json|palette` – control the output representation.
- `--output result.json` – write the result to a file; otherwise prints to stdout.
- `--quiet` – suppress progress logging during annealing.

The legacy `node index.js` command still runs the default optimization if you prefer not to use the CLI.

### Testing

Run `npm test` to execute the lightweight sanity checks that guard the core modules. The tests rely solely on the Node.js built-in test runner, so no extra dependencies are required.

### Modifying

The code is organized to separate algorithm building blocks from evaluation logic:
- `src/core/` contains the simulated annealing workflow (state preparation, neighbor generation, temperature finding, order optimization).
- `src/evaluators/` houses individual evaluation functions that can be mixed and matched in the configuration.
- `src/config/` provides the default config (`defaultConfig.js`) and starting palette (`defaultState.js`).
- `src/utils/` contains shared math and color helpers.
- `src/data/` includes bundled palettes you can swap in for experiments.
- `src/report/jnd.js` exposes a helper for generating just-noticeable-difference reports (see below).

To tweak the algorithm, start by copying and editing the factories in `src/config/`:

```js
const { createDefaultConfig } = require('./src/config/defaultConfig');
const { createDefaultState } = require('./src/config/defaultState');
```

There are a number of variables you can modify inside the config factory to adjust the results:

`similarityTarget` is an array of colors that culori can parse (hex strings, `{mode:'rgb',...}`, etc.) - the algorithm will attempt to find colors that are similar to these.

`config.evalFunctions` is an array of `{ function, weight, cvd? }` descriptors. Add, remove, or reorder entries to emphasise different evaluation criteria:
- Increase the weight on `evaluators.energy` to push colors further apart.
- Increase the weight on `evaluators.range` to keep distances between colors more uniform.
- Add additional `evaluators.jnd` entries with different `cvd` settings to cover more simulated deficiencies.
- Swap `evaluators.similarity` or change `config.similarityTarget` to chase a different reference palette.

`config.colorDistance` lets you choose the distance method (see the [Culori distance documentation](https://culorijs.org/docs/color-difference/)) and optional analysis space (default `'lab65'`) used throughout optimisation and reporting. For example:

```js
const config = createDefaultConfig();

config.colorDistance = {
  method: 'cmc',
  space: 'oklab',
  cmc: { l: 2, c: 1 }, // optional CMC parameters
};

// pass `config` into prepareInitialState or reportJndIssues(...)
```

For the most up-to-date list of supported color spaces and distance methods, refer to the [official Culori documentation](https://culorijs.org/docs/).

`config.colorSpace` controls the working space for initialization and mutation. Each entry in `ranges` corresponds to a channel in the chosen mode. Cyclic channels (e.g. hue) are automatically detected from the color mode definition:

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

You can optionally override the automatic wrap detection by providing a `wrap` array, but this is rarely necessary.

The annealing schedule itself is controlled by a few more values:

- The starting temperature is calculated automatically by sampling random mutations from the initial state. `initialTemperatureSamples` sets how many mutations to sample, and `initialAcceptanceRate` sets the desired probability of accepting a cost-increasing move at the start of the run.
- `coolingRate` is the multiplier applied to the temperature at each iteration. A rate closer to 1 cools more slowly and results in more iterations.
- `cutoff` is the temperature at which the algorithm stops optimizing and returns results. A lower cutoff means more late-stage iterations where improvements are minimal.
- `maxIterations` caps the total number of iterations regardless of temperature.

### Channel Locking

You can lock specific color channels during optimization to preserve certain aspects of colors while allowing others to vary. This is useful for maintaining brand colors' hue while optimizing saturation and lightness for accessibility.

To lock channels, provide colors as objects with a `lockedChannels` array:

```js
const colors = [
    { color: '#ff0000', lockedChannels: [0] },     // Lock hue (channel 0 in okhsl)
    { color: '#00ff00', lockedChannels: [0, 1] },  // Lock hue and saturation
    '#0000ff',                                     // Fully mutable
];

const { finalState } = generatePalette({ state: colors, config });
```

Channel indices correspond to the color space mode:
- **okhsl/hsl**: `[0]=hue`, `[1]=saturation`, `[2]=lightness`
- **oklab/lab**: `[0]=lightness`, `[1]=a`, `[2]=b`
- **rgb**: `[0]=red`, `[1]=green`, `[2]=blue`

See [examples/channelLocking.js](examples/channelLocking.js) for complete examples.

### WCAG Contrast Optimization

A new `contrast` evaluator optimizes palettes for WCAG accessibility contrast requirements. This is essential for ensuring colors meet minimum contrast ratios against backgrounds.

Add the evaluator to your config with parameters specified in the evalFunction descriptor:

```js
const evaluators = require('./src/evaluators');

const config = {
    evalFunctions: [
        { function: evaluators.energy, weight: 0.2 },
        {
            function: evaluators.contrast,
            weight: 0.8,
            background: '#ffffff',  // Background color for contrast checks
            ratio: 3,               // 3:1 for non-text, 4.5:1 for AA text, 7:1 for AAA
            checkAdjacent: false,   // Optionally check contrast between adjacent colors
        },
    ],
};
```

The evaluator uses Culori's built-in `wcagContrast()` function to calculate WCAG 2.1 contrast ratios. It applies exponential penalties when colors fall below the required ratio, encouraging the optimizer to find high-contrast solutions.

Combine with channel locking to optimize brand colors for accessibility:

```js
const brandColors = [
    { color: '#e74c3c', lockedChannels: [0] },  // Keep brand red hue
    { color: '#3498db', lockedChannels: [0] },  // Keep brand blue hue
];

const config = {
    evalFunctions: [{
        function: evaluators.contrast,
        weight: 1.0,
        background: '#ffffff',
        ratio: 4.5,  // WCAG AA text requirement
    }],
};

const { finalState } = generatePalette({ state: brandColors, config });
// Results in brand-aligned colors that meet AA contrast standards
```

See [examples/wcagContrast.js](examples/wcagContrast.js) for complete examples including dark mode and adjacent color checking.

### Avoiding Specific Colors

The `avoid` evaluator is the inverse of `similarity`: it pushes the palette away from a set of colors instead of pulling it toward them. Use it to keep generated colors clear of a brand color, a background, or semantic colors (error red, success green) that categorical colors shouldn't be confused with.

Colors and radius are specified on the evalFunction descriptor:

```js
const evaluators = require('./src/evaluators');

const config = {
    evalFunctions: [
        { function: evaluators.energy, weight: 0.2 },
        {
            function: evaluators.avoid,
            weight: 0.8,
            colors: ['#e74c3c', '#2ecc71'],  // Colors to steer away from
            radius: 0.15,                    // Penalty radius, as a fraction of the
                                             // metric's maximum distance (default 0.15)
        },
    ],
};
```

Each palette color is charged for how far it has intruded into the radius around its nearest avoid color — a linear ramp from 1 (exact match) to 0 (at the radius edge) — and costs nothing once outside every radius. Unlike similarity targets, avoid colors are measured exactly as given rather than coerced into the working color space, since the point is distance from the actual color. Multiple `avoid` entries with different color sets, radii, and weights can be combined.

### Creating Custom Evaluators

The codebase follows a standardized pattern for evaluators, making it easy to create your own.

#### Evaluator Function Signature

All evaluators follow this signature:

```js
const myEvaluator = (state, config, descriptor = {}) => {
    // Extract your parameters from descriptor
    const { myParam = defaultValue } = descriptor;

    // Calculate cost based on state.colors
    let cost = 0;
    // ... your logic here

    // Return normalized cost
    return cost;
};
```

**Parameters:**
- **state**: Object containing `{ colors, temperature, iterations, cost }`
- **config**: Global configuration object
- **descriptor**: The evalFunction entry from config, containing evaluator-specific parameters

#### Pattern to Follow

1. **Extract parameters from descriptor** (not from top-level config):
   ```js
   const { background = '#ffffff', ratio = 3 } = descriptor;
   ```

2. **Calculate cost** based on `state.colors`:
   ```js
   state.colors.forEach((color) => {
       // Calculate and accumulate cost
   });
   ```

3. **Normalize cost** to keep contribution consistent:
   ```js
   return cost / state.colors.length; // or numPairs, numChecks, etc.
   ```

4. **Use exponential penalties** for smooth optimization:
   ```js
   if (value < threshold) {
       cost += Math.pow(threshold / value, 4); // Steep penalty
   }
   ```

#### Example: Custom "Warm Colors" Evaluator

```js
const { converter } = require('culori');

const evaluateWarmness = (state, config, descriptor = {}) => {
    const { targetHue = 30, tolerance = 60 } = descriptor;
    const toHsl = converter('hsl');

    let cost = 0;

    state.colors.forEach((color) => {
        const hsl = toHsl(color);
        const hueDiff = Math.abs(hsl.h - targetHue);

        // Penalize colors outside tolerance
        if (hueDiff > tolerance) {
            cost += Math.pow((hueDiff - tolerance) / 180, 2);
        }
    });

    return cost / state.colors.length;
};

module.exports = evaluateWarmness;
```

**Usage:**

```js
const myEvaluator = require('./myEvaluator');

const config = {
    evalFunctions: [
        { function: evaluators.energy, weight: 0.3 },
        {
            function: myEvaluator,
            weight: 0.7,
            targetHue: 30,    // Your custom parameters
            tolerance: 60,
        },
    ],
};
```

**Benefits:**
- **Composable**: Multiple instances with different parameters
- **Reusable**: Parameters don't pollute global config
- **Consistent**: Follows same pattern as CVD parameters in JND evaluator
- **Type-safe**: Parameters are co-located with the function reference

### JND Reporting

You can audit an existing palette with the built-in report helper:

```js
const { reports } = require('./src');

const palette = ['#ff0000', '#f20000', '#00ff00', '#0000ff'];
const result = reports.reportJndIssues(palette, {
  distanceMethod: 'ciede2000',
  distanceSpace: 'lab65',
  jndThreshold: 25,
  cvdSimulations: [
    { type: 'protanomaly', severity: 1 },
    { type: 'deuteranomaly', severity: 0.5 },
  ],
});

console.log(JSON.stringify(result, null, 2));
```

The report lists all pairs that fall below the JND threshold in the base palette and in any simulated color-vision deficiency modes you request.
