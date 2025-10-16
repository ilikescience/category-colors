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
- `scripts/hamiltonian.js` is a standalone script built around the same utilities for graph experiments.

To tweak the algorithm, start by copying and editing the factories in `src/config/`:

```js
const { createDefaultConfig } = require('./src/config/defaultConfig');
const { createDefaultState } = require('./src/config/defaultState');
```

There are a number of variables you can modify inside the config factory to adjust the results:

`targetColors` is an array of colors which can be any format readable by [colorjs.io](https://colorjs.io/) - the algorithm will attempt to find colors that are similar to these.

`config.evalFunctions` is an array of `{ function, weight, cvd? }` descriptors. Add, remove, or reorder entries to emphasise different evaluation criteria:
- Increase the weight on `evaluators.energy` to push colors further apart.
- Increase the weight on `evaluators.range` to keep distances between colors more uniform.
- Add additional `evaluators.jnd` entries with different `cvd` settings to cover more simulated deficiencies.
- Swap `evaluators.similarity` or change `config.similarityTarget` to chase a different reference palette.

`temperature` can be any floating point number. It is the starting point temperature of the algorithm - a higher temperature means that early iterations are more likely to be randomly-chosen than optimized.

`coolingRate` can be any floating point number. It is the decrease in temperature at each iteration. A lower cooling rate will result in more iterations.

`cutoff` is the temperature at which the algorithm will stop optimizing and return results. A lower cutoff means more late-stage iterations where improvements are minimal.
