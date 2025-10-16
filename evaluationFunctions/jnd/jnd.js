// A revised JND evaluation with a continuous penalty
const evaluateJnd = (state, config) => {
  const { jnd, deltaEMethod } = config;
  const { colors } = state;
  let cost = 0;
  const numPairs = (colors.length * (colors.length - 1)) / 2;

  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const color1 = colors[i];
      const color2 = colors[j];
      const deltaE = color1.deltaE(color2, deltaEMethod);

      // If deltaE is less than JND, cost increases exponentially.
      // If deltaE is greater than JND, cost is small but non-zero.
      // This creates a smooth gradient to optimize.
      if (deltaE > 0) {
        cost += (jnd / deltaE) ** 4;
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
