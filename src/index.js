// Public entry point. Everything here is browser-safe — nothing in this graph
// touches node:fs or node:path. The CLI helpers that do live behind the
// 'category-colors/cli' subpath instead.

export { prepareInitialState } from './core/state.js';
export { runSimulatedAnnealing, runWithOrderOptimization } from './core/annealing.js';
export { cost, costBreakdown } from './core/cost.js';
export { default as simulateCvd } from './core/simulateCvd.js';

export { createDefaultConfig } from './config/defaultConfig.js';
export { createDefaultState } from './config/defaultState.js';

export { deltaE } from './utils/deltaE.js';
export { createColor, getChannels } from './utils/paletteColor.js';

export {
    evaluators,
    energy,
    range,
    similarity,
    avoid,
    jnd,
    contrast,
    saliency,
} from './evaluators/index.js';
export { palettes } from './data/index.js';
export { reportJndIssues } from './report/jnd.js';
