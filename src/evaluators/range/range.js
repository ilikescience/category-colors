const { deltaE } = require('../../utils/deltaE');
const { resolveDistanceOptions } = require('../../utils/distanceOptions');

const calculateUniformityMetric = (arr) => {
    if (arr.length <= 1) {
        return 1; // If there's only one or no value, consider uniformity as perfect
    }

    const sum = arr.reduce((a, b) => a + b, 0);
    const mean = sum / arr.length;

    const variance = arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / arr.length;
    const standardDeviation = Math.sqrt(variance);

    const range = Math.max(...arr) - Math.min(...arr);
    if (range === 0) {
        return 1;
    }

    const metric = 1 - standardDeviation / range;
    return metric;
};

const evaluateRange = (state, config) => {
    const distances = [];
    const distanceOptions = resolveDistanceOptions(config);
    for (let i = 0; i < state.colors.length; i++) {
        for (let j = i + 1; j < state.colors.length; j++) {
            const color = state.colors[i];
            const compareColor = state.colors[j];
            const thisDistance = deltaE(color, compareColor, distanceOptions);
            distances.push(thisDistance);
        }
    }
    return 1 - calculateUniformityMetric(distances);
};

module.exports = evaluateRange;
