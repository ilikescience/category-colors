const { deltaE } = require('../utils/deltaE');
const { resolveDistanceOptions } = require('../utils/distanceOptions');

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

const evaluatePathCost = (path, matrix) => {
    let sum = 0;
    let sumSquares = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const distance = matrix[path[i]][path[i + 1]];
        sum += distance;
        sumSquares += distance * distance;
    }
    const edgeCount = path.length - 1;
    const mean = sum / edgeCount;
    const variance = Math.max(sumSquares / edgeCount - mean * mean, 0);
    const stdDev = Math.sqrt(variance);
    return stdDev / mean;
};

const optimizeColorOrder = (state, config) => {
    const count = state.colors.length;
    if (count <= 2) {
        return state.colors.slice();
    }

    const matrix = buildDistanceMatrix(state, config);
    const requiredPositions = state.colors.map((color, index) =>
        color.fixedOrder ? index : null
    );

    const used = new Array(count).fill(false);
    let bestPath = null;
    let bestCost = Infinity;

    const dfs = (path, sum, sumSquares) => {
        const position = path.length;
        if (position === count) {
            const edgeCount = count - 1;
            const mean = sum / edgeCount;
            const variance = Math.max(sumSquares / edgeCount - mean * mean, 0);
            const stdDev = Math.sqrt(variance);
            const cost = stdDev / mean;
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

    if (!bestPath) {
        bestPath = Array.from({ length: count }, (_, i) => i);
    }

    return bestPath.map((index) => state.colors[index]);
};

module.exports = {
    optimizeColorOrder,
};
