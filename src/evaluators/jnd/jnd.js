const { deltaE } = require('../../utils/deltaE');
const { resolveDistanceOptions } = require('../../utils/distanceOptions');

// A revised JND evaluation with a continuous penalty
const evaluateJnd = (state, config) => {
  const { jnd } = config;
  const { colors } = state;
  let cost = 0;
  const numPairs = (colors.length * (colors.length - 1)) / 2;
  const distanceOptions = resolveDistanceOptions(config);

  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const color1 = colors[i];
      const color2 = colors[j];
      const difference = deltaE(color1, color2, distanceOptions);

      // If deltaE is less than JND, cost increases exponentially.
      // If deltaE is greater than JND, cost is small but non-zero.
      // This creates a smooth gradient to optimize.
      if (difference > 0) {
        cost += (jnd / difference) ** 4;
      } else {
        // Assign a very high cost for identical colors to avoid division by zero
        cost += 1000;
      }
    }
  }

  // We normalize by the number of pairs to keep the cost contribution consistent.
  return cost / numPairs;
};

module.exports = evaluateJnd;
