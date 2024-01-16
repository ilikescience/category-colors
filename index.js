const chroma = require("chroma-js");

const targetColors = [
    "#4269d0",
    "#efb118",
    "#ff725c",
    "#6cc5b0",
    "#3ca951",
    "#ff8ab7",
    "#a463f2",
    "#97bbf5",
    "#9c6b4e",
    "#9498a0",
  ];

const avoidColors = ["#FF0000", "#000000"];

const providedColors = [
  "#4269d0",
  "#efb118",
  "#ff725c",
  "#6cc5b0",
  "#3ca951",
  "#ff8ab7",
  "#a463f2",
  "#97bbf5",
  "#9c6b4e",
  "#9498a0",
];

const fixedColors = 0;

const backgroundColor = "#ffffff";

// random from array
const randomFromArray = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// generate a random color
const randomColor = () => {
  const color = chroma.random();
  return color;
};

// measures the distance between two colors
const distance = (color1, color2) => chroma.deltaE(color1, color2);

const getClosestColor = (color, colorArray) => {
  const distances = colorArray.map((c) => distance(color, c));
  const minIndex = distances.indexOf(Math.min(...distances));
  return colorArray[minIndex];
};

// array of distances between all points in a color array
const distances = (colorArray, visionSpace = "Normal") => {
  const distances = [];
  const convertedColors = colorArray.map((c) =>
    brettelFunctions[visionSpace](c.rgb())
  );
  for (let i = 0; i < colorArray.length; i++) {
    for (let j = i + 1; j < colorArray.length; j++) {
      distances.push(distance(convertedColors[i], convertedColors[j]));
    }
  }
  return distances;
};

// get average of interger array
const average = (array) => array.reduce((a, b) => a + b) / array.length;

// get the distance between the highest and lowest values in an array
const range = (array) => {
  const sorted = array.sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0];
};

// produces a color a small random distance away from the given color
const randomNearbyColor = (color) => {
  const channelToChange = randomFromArray([0, 1, 2]);
  const oldVal = color.gl()[channelToChange];
  let newVal = oldVal + Math.random() * 0.1 - 0.05;
  if (newVal > 1) {
    newVal = 1;
  } else if (newVal < 0) {
    newVal = 0;
  }
  return color.set(`rgb.${"rgb"[channelToChange]}`, newVal * 255);
};

// average of distances between array of colors and given colors
const averageDistanceFromColors = (testColors, givenColors) => {
  const distances = testColors.map((c) =>
    distance(c, getClosestColor(c, givenColors))
  );
  return average(distances);
};

// maximum distance between array of colors and given colors
const maxDistanceFromColors = (testColors, givenColors) => {
  const distances = testColors.map((c) =>
    distance(c, getClosestColor(c, givenColors))
  );
  return Math.max(...distances);
};

const minDistanceFromColors = (testColors, givenColors) => {
  const distances = testColors.map((c) =>
    distance(c, getClosestColor(c, givenColors))
  );
  return Math.min(...distances);
};

// Bretel et al method for simulating color vision deficiency
// Adapted from https://github.com/MaPePeR/jsColorblindSimulator
// In turn adapted from libDaltonLens https://daltonlens.org (public domain)

// convert a linear rgb value to sRGB
const linearRGB_from_sRGB = (v) => {
  var fv = v / 255.0;
  if (fv < 0.04045) return fv / 12.92;
  return Math.pow((fv + 0.055) / 1.055, 2.4);
};

const sRGB_from_linearRGB = (v) => {
  if (v <= 0) return 0;
  if (v >= 1) return 255;
  if (v < 0.0031308) return 0.5 + v * 12.92 * 255;
  return 0 + 255 * (Math.pow(v, 1.0 / 2.4) * 1.055 - 0.055);
};

const brettelFunctions = {
  Normal: function (v) {
    return v;
  },
  Protanopia: function (v) {
    return brettel(v, "protan", 1.0);
  },
  Protanomaly: function (v) {
    return brettel(v, "protan", 0.6);
  },
  Deuteranopia: function (v) {
    return brettel(v, "deutan", 1.0);
  },
  Deuteranomaly: function (v) {
    return brettel(v, "deutan", 0.6);
  },
  Tritanopia: function (v) {
    return brettel(v, "tritan", 1.0);
  },
  Tritanomaly: function (v) {
    return brettel(v, "tritan", 0.6);
  },
  Achromatopsia: function (v) {
    return monochrome_with_severity(v, 1.0);
  },
  Achromatomaly: function (v) {
    return monochrome_with_severity(v, 0.6);
  },
};

var sRGB_to_linearRGB_Lookup = Array(256);
(function () {
  var i;
  for (i = 0; i < 256; i++) {
    sRGB_to_linearRGB_Lookup[i] = linearRGB_from_sRGB(i);
  }
})();

brettel_params = {
  protan: {
    rgbCvdFromRgb_1: [
      0.1451, 1.20165, -0.34675, 0.10447, 0.85316, 0.04237, 0.00429, -0.00603,
      1.00174,
    ],
    rgbCvdFromRgb_2: [
      0.14115, 1.16782, -0.30897, 0.10495, 0.8573, 0.03776, 0.00431, -0.00586,
      1.00155,
    ],
    separationPlaneNormal: [0.00048, 0.00416, -0.00464],
  },

  deutan: {
    rgbCvdFromRgb_1: [
      0.36198, 0.86755, -0.22953, 0.26099, 0.64512, 0.09389, -0.01975, 0.02686,
      0.99289,
    ],
    rgbCvdFromRgb_2: [
      0.37009, 0.8854, -0.25549, 0.25767, 0.63782, 0.10451, -0.0195, 0.02741,
      0.99209,
    ],
    separationPlaneNormal: [-0.00293, -0.00645, 0.00938],
  },

  tritan: {
    rgbCvdFromRgb_1: [
      1.01354, 0.14268, -0.15622, -0.01181, 0.87561, 0.13619, 0.07707, 0.81208,
      0.11085,
    ],
    rgbCvdFromRgb_2: [
      0.93337, 0.19999, -0.13336, 0.05809, 0.82565, 0.11626, -0.37923, 1.13825,
      0.24098,
    ],
    separationPlaneNormal: [0.0396, -0.02831, -0.01129],
  },
};

function brettel(srgb, t, severity) {
  // Go from sRGB to linearRGB
  var rgb = Array(3);
  rgb[0] = sRGB_to_linearRGB_Lookup[srgb[0]];
  rgb[1] = sRGB_to_linearRGB_Lookup[srgb[1]];
  rgb[2] = sRGB_to_linearRGB_Lookup[srgb[2]];

  var params = brettel_params[t];
  var separationPlaneNormal = params["separationPlaneNormal"];
  var rgbCvdFromRgb_1 = params["rgbCvdFromRgb_1"];
  var rgbCvdFromRgb_2 = params["rgbCvdFromRgb_2"];

  // Check on which plane we should project by comparing wih the separation plane normal.
  var dotWithSepPlane =
    rgb[0] * separationPlaneNormal[0] +
    rgb[1] * separationPlaneNormal[1] +
    rgb[2] * separationPlaneNormal[2];
  var rgbCvdFromRgb = dotWithSepPlane >= 0 ? rgbCvdFromRgb_1 : rgbCvdFromRgb_2;

  // Transform to the full dichromat projection plane.
  var rgb_cvd = Array(3);
  rgb_cvd[0] =
    rgbCvdFromRgb[0] * rgb[0] +
    rgbCvdFromRgb[1] * rgb[1] +
    rgbCvdFromRgb[2] * rgb[2];
  rgb_cvd[1] =
    rgbCvdFromRgb[3] * rgb[0] +
    rgbCvdFromRgb[4] * rgb[1] +
    rgbCvdFromRgb[5] * rgb[2];
  rgb_cvd[2] =
    rgbCvdFromRgb[6] * rgb[0] +
    rgbCvdFromRgb[7] * rgb[1] +
    rgbCvdFromRgb[8] * rgb[2];

  // Apply the severity factor as a linear interpolation.
  // It's the same to do it in the RGB space or in the LMS
  // space since it's a linear transform.
  rgb_cvd[0] = rgb_cvd[0] * severity + rgb[0] * (1.0 - severity);
  rgb_cvd[1] = rgb_cvd[1] * severity + rgb[1] * (1.0 - severity);
  rgb_cvd[2] = rgb_cvd[2] * severity + rgb[2] * (1.0 - severity);

  // Go back to sRGB
  return [
    sRGB_from_linearRGB(rgb_cvd[0]),
    sRGB_from_linearRGB(rgb_cvd[1]),
    sRGB_from_linearRGB(rgb_cvd[2]),
  ];
}

// Adjusted from the hcirn code
function monochrome_with_severity(srgb, severity) {
  var z = Math.round(srgb[0] * 0.299 + srgb[1] * 0.587 + srgb[2] * 0.114);
  var r = z * severity + (1.0 - severity) * srgb[0];
  var g = z * severity + (1.0 - severity) * srgb[1];
  var b = z * severity + (1.0 - severity) * srgb[2];
  return [r, g, b];
}

// Cost function including weights
const cost = (state) => {
  const energyWeight = 1.25;
  const rangeWeight = 1;
  const targetWeight = 0.75;
  const avoidWeight = 0.5;
  const contrastWeight = 0.25;

  const protanopiaWeight = 0.1;
  const protanomalyWeight = 0.1;

  const deuteranopiaWeight = 0.1;
  const deuteranomalyWeight = 0.5;

  const tritanopiaWeight = 0.05;
  const tritanomalyWeight = 0.05;

  const normalDistances = distances(state);

  const protanopiaDistances = distances(state, "Protanopia");
  const protanomalyDistances = distances(state, "Protanomaly");

  const deuteranopiaDistances = distances(state, "Deuteranopia");
  const deuteranomalyDistances = distances(state, "Deuteranomaly");

  const tritanopiaDistances = distances(state, "Tritanopia");
  const tritanomalyDistances = distances(state, "Tritanomaly");

  const energyScore = 100 - average(normalDistances);
  const rangeScore = range(normalDistances);
  const targetScore = targetColors.length ? averageDistanceFromColors(state, targetColors) : 0;
  const avoidScore = avoidColors.length ? 100 - minDistanceFromColors(state, avoidColors) : 0;

  const protanopiaScore = 100 - average(protanopiaDistances);
  const protanomalyScore = 100 - average(protanomalyDistances);

  const deuteranopiaScore = 100 - average(deuteranopiaDistances);
  const deuteranomalyScore = 100 - average(deuteranomalyDistances);

  const tritanopiaScore = 100 - average(tritanopiaDistances);
  const triatanomalyScore = 100 - average(tritanomalyDistances);

  const maxPossibleContrast = 21; // Theoretical maximum contrast ratio in WCAG
  const minContrast = state.reduce(
    (acc, color) => Math.min(chroma.contrast(color, backgroundColor), acc),
    maxPossibleContrast
  );
  const contrastScore = 100 - (minContrast / maxPossibleContrast) * 100;

  return (
    energyWeight * energyScore +
    targetWeight * targetScore +
    rangeWeight * rangeScore +
    avoidWeight * avoidScore +
    protanopiaWeight * protanopiaScore +
    protanomalyWeight * protanomalyScore +
    deuteranopiaWeight * deuteranopiaScore +
    deuteranomalyWeight * deuteranomalyScore +
    tritanopiaWeight * tritanopiaScore +
    tritanomalyWeight * tritanopiaScore +
    contrastWeight * contrastScore
  );
};

// the simulated annealing algorithm
const optimize = (n = 5) => {
  const colors = [];
  providedColors.forEach((color) => colors.push(chroma(color)));
  for (let i = fixedColors + providedColors.length; i < n; i++) {
    colors.push(randomColor());
  }

  const startColors = Array.from(colors);
  const startCost = cost(startColors);

  // intialize hyperparameters
  let temperature = 1000;
  const coolingRate = 0.99;
  const cutoff = 0.0001;

  // iteration loop
  while (temperature > cutoff) {
    // for each color
    for (let i = fixedColors; i < colors.length; i++) {
      // copy old colors
      const newColors = colors.map((color) => color);
      // move the current color randomly
      newColors[i] = randomNearbyColor(newColors[i]);
      // choose between the current state and the new state
      // based on the difference between the two, the temperature
      // of the algorithm, and some random chance
      const delta = cost(newColors) - cost(colors);
      const probability = Math.exp(-delta / temperature);
      if (Math.random() < probability) {
        colors[i] = newColors[i];
      }
    }
    console.log(`Current cost: ${cost(colors)}`);

    // decrease temperature
    temperature *= coolingRate;
  }

  console.log(`
Start colors: ${startColors.map((color) => color.hex())}
Start cost: ${startCost}
Final colors: ${colors.reduce((acc, color) => acc + `"${color.hex()}" `, "")}
Final cost: ${cost(colors)}
Cost difference: ${cost(colors) - startCost}`);
  return colors;
};

optimize(10);
