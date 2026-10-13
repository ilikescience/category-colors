import { pairwiseDistances } from '../../utils/deltaE.js';
import { resolveDistanceOptions } from '../../utils/distanceOptions.js';

// A revised JND evaluation with a continuous penalty. The fourth power is two
// squarings: V8 squares exactly but computes other powers through a general
// routine several times slower.
const evaluateJnd = (state, config) => {
  const { jnd } = config;
  const { colors } = state;
  const n = colors.length;
  const numPairs = (n * (n - 1)) / 2;
  const distances = pairwiseDistances(colors, resolveDistanceOptions(config));
  let cost = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const difference = distances[i * n + j];

      // If deltaE is less than JND, cost increases exponentially.
      // If deltaE is greater than JND, cost is small but non-zero.
      // This creates a smooth gradient to optimize.
      if (difference > 0) {
        const ratio = (jnd / difference) ** 2;
        cost += ratio * ratio;
      } else {
        // Assign a very high cost for identical colors to avoid division by zero
        cost += 1000;
      }
    }
  }

  // We normalize by the number of pairs to keep the cost contribution consistent.
  return cost / numPairs;
};

export default evaluateJnd;
