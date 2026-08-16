import { deltaE } from '../utils/deltaE.js';
import { resolveDistanceOptions } from '../utils/distanceOptions.js';

// Exhaustive search is O(n!); beyond this many colors, fall back to a
// pairwise-swap local search instead.
const MAX_EXHAUSTIVE_COLORS = 10;

const buildDistanceMatrix = (state, config) => {
    if (state.metrics && state.metrics.deltaEMatrix) {
        return state.metrics.deltaEMatrix;
    }
    const length = state.colors.length;
    const matrix = Array.from({ length }, () => new Float64Array(length));
    const distanceOptions = resolveDistanceOptions(config);
    for (let i = 0; i < length; i++) {
        matrix[i][i] = 0;
        for (let j = i + 1; j < length; j++) {
            const distance = deltaE(state.colors[i], state.colors[j], distanceOptions);
            matrix[i][j] = distance;
            matrix[j][i] = distance;
        }
    }
    return matrix;
};

// Coefficient of variation of the adjacent-pair distances along the path.
const pathCostFromSums = (sum, sumSquares, edgeCount) => {
    const mean = sum / edgeCount;
    const variance = Math.max(sumSquares / edgeCount - mean * mean, 0);
    return Math.sqrt(variance) / mean;
};

const evaluatePathCost = (path, matrix) => {
    let sum = 0;
    let sumSquares = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const distance = matrix[path[i]][path[i + 1]];
        sum += distance;
        sumSquares += distance * distance;
    }
    return pathCostFromSums(sum, sumSquares, path.length - 1);
};

const findBestOrderExhaustively = (state, matrix) => {
    const count = state.colors.length;
    const requiredPositions = state.colors.map((color, index) =>
        color.fixedOrder ? index : null
    );

    const used = new Array(count).fill(false);
    let bestPath = null;
    let bestCost = Infinity;

    const dfs = (path, sum, sumSquares) => {
        const position = path.length;
        if (position === count) {
            const cost = pathCostFromSums(sum, sumSquares, count - 1);
            if (cost < bestCost) {
                bestCost = cost;
                bestPath = path.slice();
            }
            return;
        }

        const requiredIndex = requiredPositions[position];
        const candidates =
            requiredIndex != null ? [requiredIndex] : Array.from({ length: count }, (_, i) => i);

        for (const candidate of candidates) {
            if (used[candidate]) continue;
            if (state.colors[candidate].fixedOrder && candidate !== position) continue;

            const previous = path[path.length - 1];
            const distance = path.length === 0 ? 0 : matrix[previous][candidate];
            used[candidate] = true;
            path.push(candidate);
            dfs(
                path,
                path.length === 1 ? 0 : sum + distance,
                path.length === 1 ? 0 : sumSquares + distance * distance
            );
            path.pop();
            used[candidate] = false;
        }
    };

    const startRequired = requiredPositions[0];
    if (startRequired != null) {
        used[startRequired] = true;
        dfs([startRequired], 0, 0);
        used[startRequired] = false;
    } else {
        for (let i = 0; i < count; i++) {
            used[i] = true;
            dfs([i], 0, 0);
            used[i] = false;
        }
    }

    return bestPath;
};

const findBestOrderBySwaps = (state, matrix) => {
    const count = state.colors.length;
    const path = Array.from({ length: count }, (_, i) => i);
    const swappable = path.filter((i) => !state.colors[i].fixedOrder);
    let bestCost = evaluatePathCost(path, matrix);

    let improved = true;
    while (improved) {
        improved = false;
        for (let a = 0; a < swappable.length; a++) {
            for (let b = a + 1; b < swappable.length; b++) {
                const i = swappable[a];
                const j = swappable[b];
                [path[i], path[j]] = [path[j], path[i]];
                const cost = evaluatePathCost(path, matrix);
                if (cost < bestCost) {
                    bestCost = cost;
                    improved = true;
                } else {
                    [path[i], path[j]] = [path[j], path[i]];
                }
            }
        }
    }

    return path;
};

const optimizeColorOrder = (state, config) => {
    const count = state.colors.length;
    if (count <= 2) {
        return state.colors.slice();
    }

    const matrix = buildDistanceMatrix(state, config);

    let bestPath;
    if (count > MAX_EXHAUSTIVE_COLORS) {
        if (config.logProgress !== false) {
            console.warn(
                `Palette has ${count} colors; using swap-based order optimization instead of exhaustive search.`
            );
        }
        bestPath = findBestOrderBySwaps(state, matrix);
    } else {
        bestPath = findBestOrderExhaustively(state, matrix);
    }

    if (!bestPath) {
        bestPath = Array.from({ length: count }, (_, i) => i);
    }

    return bestPath.map((index) => state.colors[index]);
};

export { optimizeColorOrder };
