
const calculateUniformityMetric = (arr) => {
    if (arr.length <= 1) {
        return 1; // If there's only one or no value, consider uniformity as perfect
    }

    let sum = arr.reduce((a, b) => a + b, 0);
    const mean = sum / arr.length;

    // Calculate the standard deviation
    const variance = arr.reduce((acc, val) => acc + (val - mean) ** 2, 0) / arr.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate the range (max value - min value)
    const range = Math.max(...arr) - Math.min(...arr);

    if (range === 0) {
        // All values are equal
        return 1;
    }

    // Calculate the uniformity metric
    const metric = 1 - standardDeviation / range;

    return metric;
};

// evaluates how similar the distances between the colors are
// should return 0 if all distances are the same, and 1 if all distances are maximally different

const evaluateRange = (state) => {
    const distances = [];
    for (let i = 0; i < state.colors.length; i++) {
        for (let j = i+1; j < state.colors.length; j++) {
            const color = state.colors[i];
            const compareColor = state.colors[j];
            const thisDistance = color.deltaE(compareColor, '2000');
            distances.push(thisDistance);
        }
    }
    return 1 - calculateUniformityMetric(distances);
};

module.exports = evaluateRange;