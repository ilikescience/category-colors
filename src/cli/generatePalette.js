const fs = require('fs');
const path = require('path');
const { runSimulatedAnnealing, runWithOrderOptimization } = require('../core/annealing');
const { prepareInitialState } = require('../core/state');
const { createDefaultConfig } = require('../config/defaultConfig');
const { createDefaultState } = require('../config/defaultState');

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const deepMerge = (target, source) => {
    const result = { ...target };
    Object.keys(source).forEach((key) => {
        const sourceValue = source[key];
        const targetValue = result[key];
        if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        } else {
            result[key] = sourceValue;
        }
    });
    return result;
};

const resolveModule = (inputPath) => {
    const absolutePath = path.isAbsolute(inputPath)
        ? inputPath
        : path.resolve(process.cwd(), inputPath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Unable to locate file at ${absolutePath}`);
    }
    // eslint-disable-next-line global-require, import/no-dynamic-require
    let loaded = require(absolutePath);
    if (loaded && typeof loaded === 'object' && 'default' in loaded) {
        loaded = loaded.default;
    }
    return loaded;
};

const loadConfigFromPath = (configPath, baseConfig) => {
    const loaded = resolveModule(configPath);
    if (typeof loaded === 'function') {
        const result = loaded(baseConfig);
        if (result === undefined) {
            return baseConfig;
        }
        if (!isPlainObject(result)) {
            throw new Error('Config loader function must return a plain object.');
        }
        return result;
    }
    if (isPlainObject(loaded)) {
        return deepMerge(baseConfig, loaded);
    }
    throw new Error('Config file must export a function or plain object.');
};

const loadStateFromPath = (statePath, baseState, config) => {
    const loaded = resolveModule(statePath);
    if (typeof loaded === 'function') {
        const result = loaded(baseState, config);
        if (result === undefined) {
            return baseState;
        }
        if (isPlainObject(result)) {
            return deepMerge(baseState, result);
        }
        if (Array.isArray(result)) {
            return {
                ...baseState,
                colors: result,
            };
        }
        throw new Error('State loader function must return a plain object or colors array.');
    }
    if (isPlainObject(loaded)) {
        return deepMerge(baseState, loaded);
    }
    if (Array.isArray(loaded)) {
        return {
            ...baseState,
            colors: loaded,
        };
    }
    throw new Error('State file must export a function, plain object, or array of colors.');
};

const buildConfig = ({ configPath, inlineConfig, logProgress } = {}) => {
    let config = createDefaultConfig();
    if (isPlainObject(inlineConfig)) {
        config = deepMerge(config, inlineConfig);
    }
    if (configPath) {
        config = loadConfigFromPath(configPath, config);
    }
    if (logProgress !== undefined) {
        config.logProgress = Boolean(logProgress);
    }
    return config;
};

const buildState = ({ statePath, inlineState, config } = {}) => {
    let state = createDefaultState();
    if (Array.isArray(inlineState)) {
        state = {
            ...state,
            colors: inlineState,
        };
    } else if (isPlainObject(inlineState)) {
        state = deepMerge(state, inlineState);
    }
    if (statePath) {
        state = loadStateFromPath(statePath, state, config);
    }
    return state;
};

const generatePalette = ({
    configPath,
    config: inlineConfig,
    statePath,
    state: inlineState,
    orderOptimization = true,
    logProgress,
} = {}) => {
    const config = buildConfig({ configPath, inlineConfig, logProgress });
    const state = buildState({ statePath, inlineState, config });
    const initialState = prepareInitialState(state, config);
    const algorithm = orderOptimization ? runWithOrderOptimization : runSimulatedAnnealing;
    const finalState = algorithm(initialState, config);
    return {
        config,
        initialState,
        finalState,
    };
};

const toHexPalette = (colors) =>
    colors.map((color) => String(color));

const formatTextSummary = (initialState, finalState) => {
    const initialColors = toHexPalette(initialState.colors);
    const finalColors = toHexPalette(finalState.colors);
    const costDifference = finalState.cost - initialState.cost;
    return [
        `Start colors: ${initialColors.join(', ')}`,
        `Start cost: ${initialState.cost}`,
        `Final colors: ${finalColors.join(', ')}`,
        `Final cost: ${finalState.cost}`,
        `Iterations: ${finalState.iterations}`,
        `Temperature: ${finalState.temperature}`,
        `Cost difference: ${costDifference}`,
    ].join('\n');
};

const buildJsonSummary = (initialState, finalState) => ({
    palette: toHexPalette(finalState.colors),
    cost: finalState.cost,
    iterations: finalState.iterations,
    temperature: finalState.temperature,
    initial: {
        palette: toHexPalette(initialState.colors),
        cost: initialState.cost,
    },
    costDifference: finalState.cost - initialState.cost,
});

module.exports = {
    generatePalette,
    formatTextSummary,
    buildJsonSummary,
    toHexPalette,
    buildConfig,
    buildState,
};
