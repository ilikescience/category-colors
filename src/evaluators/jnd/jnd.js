import { pairwiseTerms } from '../../utils/deltaE.js';
import { resolveDistanceOptions } from '../../utils/distanceOptions.js';

// If deltaE is less than JND, cost increases exponentially.
// If deltaE is greater than JND, cost is small but non-zero.
// This creates a smooth gradient to optimize. Identical colors get a very
// high cost rather than a division by zero.
const penalty = (difference, jnd) => (difference > 0 ? (jnd / difference) ** 4 : 1000);

// A revised JND evaluation with a continuous penalty
const evaluateJnd = (state, config) => {
  const { jnd } = config;
  const { colors } = state;
  let cost = 0;
  const numPairs = (colors.length * (colors.length - 1)) / 2;
  const n = colors.length;
  const penalties = pairwiseTerms(colors, resolveDistanceOptions(config), penalty, jnd);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      cost += penalties[i * n + j];
    }
  }

  // We normalize by the number of pairs to keep the cost contribution consistent.
  return cost / numPairs;
};

export default evaluateJnd;
