## How to pick the least wrong colors

This is the code to go along with the essay on my website, [How to pick the least wrong colors](https://matthewstrom.com/writing/how-to-pick-the-least-wrong-colors/).

It is a very unskilled implementation of the simulated annealing algorithm in service of creating color palettes for categorical data visualization.

It comes with an MIT License - please use it carefully and respectfully.

### Running

To generate colors, run `node index.js`.

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

`targetColors` is an array of colors that culori can parse (hex strings, `{mode:'rgb',...}`, etc.) - the algorithm will attempt to find colors that are similar to these.

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

`temperature` can be any floating point number. It is the starting point temperature of the algorithm - a higher temperature means that early iterations are more likely to be randomly-chosen than optimized.

`coolingRate` can be any floating point number. It is the decrease in temperature at each iteration. A lower cooling rate will result in more iterations.

`cutoff` is the temperature at which the algorithm will stop optimizing and return results. A lower cutoff means more late-stage iterations where improvements are minimal.
