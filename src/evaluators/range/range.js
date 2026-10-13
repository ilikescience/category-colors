import { pairwiseTerms } from '../../utils/deltaE.js';
import { resolveDistanceOptions } from '../../utils/distanceOptions.js';

// 1 - standardDeviation / range over the pairwise distances, or 1 when there
// is nothing to compare.
const calculateUniformityMetric = (arr) => {
    if (arr.length <= 1) {
        return 1;
    }

    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
        if (arr[i] < min) min = arr[i];
        if (arr[i] > max) max = arr[i];
    }
    const mean = sum / arr.length;

    let squares = 0;
    for (let i = 0; i < arr.length; i++) {
        squares += (arr[i] - mean) ** 2;
    }
    const standardDeviation = Math.sqrt(squares / arr.length);

    const range = max - min;
    if (range === 0) {
        return 1;
    }

    return 1 - standardDeviation / range;
};

const evaluateRange = (state, config) => {
    const { colors } = state;
    const n = colors.length;
    const distances = new Float64Array((n * (n - 1)) / 2);
    const matrix = pairwiseTerms(colors, resolveDistanceOptions(config), null);
    let k = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            distances[k++] = matrix[i * n + j];
        }
    }
    return 1 - calculateUniformityMetric(distances);
};

export default evaluateRange;
