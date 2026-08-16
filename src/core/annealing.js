import { getNeighbor } from './getNeighbor.js';
import { optimizeColorOrder } from './optimizeColorOrder.js';
import { cost } from './cost.js';

const shouldAcceptCandidate = (currentCost, candidateCost, temperature) => {
    if (candidateCost <= currentCost) {
        return true;
    }
    const acceptanceProbability = Math.exp(-(candidateCost - currentCost) / temperature);
    return Math.random() < acceptanceProbability;
};

const stepAnnealing = (state, config) => {
    const candidateState = getNeighbor(state, config);
    if (shouldAcceptCandidate(state.cost, candidateState.cost, state.temperature)) {
        Object.assign(state, candidateState);
    }
    if (config.logProgress !== false && state.iterations % 100 === 0) {
        console.log(
            `Iteration: ${state.iterations}, Cost: ${state.cost.toFixed(2)}, Temperature: ${state.temperature}`
        );
    }
    state.temperature *= config.coolingRate;
    state.iterations += 1;
};

// Roughly how many samples the default interval aims to collect over a run.
const TARGET_HISTORY_SAMPLES = 250;

/**
 * How many iterations the loop will actually run: whichever of the two exit
 * conditions trips first. Cooling is geometric, so reaching the cutoff takes
 * log(cutoff / T0) / log(coolingRate) steps — usually far fewer than
 * maxIterations, which is why sizing the sample interval off maxIterations
 * alone under-samples the run.
 */
const projectedIterations = (initialState, config) => {
    const { coolingRate, cutoff, maxIterations } = config;
    const startTemperature = initialState.temperature;
    const cappedAt = Number.isFinite(maxIterations) && maxIterations > 0 ? maxIterations : 1000;

    const coolable =
        coolingRate > 0 && coolingRate < 1 && startTemperature > 0 && cutoff > 0;
    if (!coolable) {
        return cappedAt;
    }
    if (startTemperature <= cutoff) {
        return 1;
    }
    const steps = Math.ceil(Math.log(cutoff / startTemperature) / Math.log(coolingRate));
    return Math.max(1, Math.min(cappedAt, steps));
};

const resolveHistoryInterval = (initialState, config) => {
    const { historyInterval } = config;
    if (historyInterval === undefined || historyInterval === null) {
        return Math.max(
            1,
            Math.round(projectedIterations(initialState, config) / TARGET_HISTORY_SAMPLES)
        );
    }
    // Rejected rather than coerced: 0 makes `iterations % interval` NaN and
    // silently records nothing, and a negative interval behaves as its
    // absolute value. Both look like a working run that lost its samples.
    if (!Number.isInteger(historyInterval) || historyInterval < 1) {
        throw new Error(
            `config.historyInterval must be a positive integer; received ${historyInterval}.`
        );
    }
    return historyInterval;
};

const runSimulatedAnnealing = (initialState, config) => {
    const state = {
        ...initialState,
        colors: initialState.colors.map((color) => color),
    };

    const recordHistory = config.recordHistory === true;
    const historyInterval = recordHistory ? resolveHistoryInterval(initialState, config) : 0;
    if (recordHistory) {
        state.costHistory = (initialState.costHistory || []).concat([
            [state.iterations, state.cost],
        ]);
    }

    while (
        state.temperature > config.cutoff &&
        state.iterations < config.maxIterations
    ) {
        stepAnnealing(state, config);
        if (recordHistory && state.iterations % historyInterval === 0) {
            state.costHistory.push([state.iterations, state.cost]);
        }
    }

    if (recordHistory) {
        const last = state.costHistory[state.costHistory.length - 1];
        if (!last || last[0] !== state.iterations) {
            state.costHistory.push([state.iterations, state.cost]);
        }
    }

    return state;
};

const runWithOrderOptimization = (initialState, config) => {
    const annealedState = runSimulatedAnnealing(initialState, config);
    const orderedColors = optimizeColorOrder(annealedState, config);
    const finalState = {
        ...annealedState,
        colors: orderedColors,
    };
    finalState.cost = cost(finalState, config);

    // Reordering changes the cost without advancing the iteration counter, so
    // this rewrites the final sample rather than appending a second one at the
    // same x — a duplicate there puts a vertical segment in any loss curve.
    // Gated on config.recordHistory, not on the presence of costHistory: a
    // state passed in from an earlier run carries one even when recording is
    // off, and appending to that would fabricate a sample.
    if (config.recordHistory === true && Array.isArray(finalState.costHistory)) {
        const history = finalState.costHistory.slice();
        const last = history[history.length - 1];
        const sample = [finalState.iterations, finalState.cost];
        if (last && last[0] === finalState.iterations) {
            history[history.length - 1] = sample;
        } else {
            history.push(sample);
        }
        finalState.costHistory = history;
    }
    return finalState;
};

export { runSimulatedAnnealing, runWithOrderOptimization };
