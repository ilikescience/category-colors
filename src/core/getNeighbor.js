// todo:
// [ ] account for temperature when deciding how to mutate the color

const { randomVector, isInRange } = require('../utils/utils.js');
const { cost } = require('./cost');
const { toOkhsl01, fromOkhsl01 } = require('../utils/colorSpace.js');

// produces a color a given distance in a random direction away from the given color in okhsl space
// respects provided ranges for hue, saturation, and luminosity
const randomlyMutateColor = (
  color,
  distance,
  hueRange,
  saturationRange,
  luminosityRange
) => {
  const okhsl = toOkhsl01(color);
  const randomVec = randomVector(3, distance);
  const ranges = [hueRange, saturationRange, luminosityRange];
  // iterate over the okhsl channels and apply the random vector, clamping to the ranges
  for (let i = 0; i < 3; i++) {
    const newValue = okhsl[i] + randomVec[i];
    const [min, max] = ranges[i];
    okhsl[i] = Math.max(min, Math.min(max, newValue));
  }
  const newColor = fromOkhsl01(okhsl);
  // preserve the fixedColor and fixedOrder properties
  newColor.fixedColor = color.fixedColor;
  newColor.fixedOrder = color.fixedOrder;

  return newColor;
};

const getNeighbor = (state, config) => {
  const neighborState = { ...state };
  const { colors } = state;
  let colorIndex;
  do {
    colorIndex = Math.floor(Math.random() * colors.length);
  } while (colors[colorIndex].fixedColor);
  const {
    hueRange,
    saturationRange,
    luminosityRange,
    maxMutationDistance,
    minMutationDistance
  } = config;
    const distance = minMutationDistance + (maxMutationDistance - minMutationDistance) * state.temperature;

  const newColor = randomlyMutateColor(
    colors[colorIndex],
    distance,
    hueRange,
    saturationRange,
    luminosityRange
  );
  neighborState.colors = colors.map((color, i) =>
    i === colorIndex ? newColor : color
  );
  neighborState.cost = cost(neighborState, config);
  return neighborState;
};

module.exports = {
  getNeighbor,
  randomlyMutateColor,
  isInRange,
};
