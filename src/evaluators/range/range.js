import { pairwiseDistances } from '../../utils/deltaE.js';
import { resolveDistanceOptions } from '../../utils/distanceOptions.js';

// 1 - standardDeviation / range over the pairwise distances in the upper
// triangle of an n×n matrix, or 1 when there is nothing to compare.
const calculateUniformityMetric = (matrix, n) => {
    const count = (n * (n - 1)) / 2;
    if (count <= 1) {
        return 1;
    }

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const value = matrix[i * n + j];
            sum += value;
            if (value < min) min = value;
            if (value > max) max = value;
        }
    }
    const mean = sum / count;

    let squares = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            squares += (matrix[i * n + j] - mean) ** 2;
        }
    }
    const standardDeviation = Math.sqrt(squares / count);

    const range = max - min;
    if (range === 0) {
        return 1;
    }

    return 1 - standardDeviation / range;
};

const evaluateRange = (state, config) => {
    const { colors } = state;
    const distances = pairwiseDistances(colors, resolveDistanceOptions(config));
    return 1 - calculateUniformityMetric(distances, colors.length);
};

export default evaluateRange;
