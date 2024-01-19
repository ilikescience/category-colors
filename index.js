// todo:
// [] rewrite anything that uses ColorJS to use chroma.js
//   [x] rewrite distances
//   [x] add cvd conversion function
//   [x] convert anything that uses distances with a CVD parameter to first convert colors, then measure distances.
//   [x] rewrite random color function to move in a uniform random direction in HSLuv

const ColorJS = require("colorjs.io");
const Color = ColorJS.default;

const { colorFromHsluv, hsluvFromColor, isOutOfHsluv } = require("./hsluv");

const simulateCvd = require("./simulateCvd");

const { clamp, gaussianRandom, randomVector } = require("./utils");

const distanceMethod = "2000";
const jnd = 3;

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
    h = Math.random() * 360;
    s = Math.random() * 100;
    l = Math.random() * 100;
    return colorFromHsluv(h, s, l);
};

// measures the distance between two colors
const distance = (color1, color2) => color1.deltaE(color2, distanceMethod);

const getClosestColor = (color, colorArray) => {
    const distances = colorArray.map((c) => distance(color, c));
    const minIndex = distances.indexOf(Math.min(...distances));
    return colorArray[minIndex];
};

// array of distances between all points in a color array
const distances = (colorArray) => {
    const distances = [];
    for (let i = 0; i < colorArray.length; i++) {
        for (let j = i + 1; j < colorArray.length; j++) {
            distances.push(distance(colorArray[i], colorArray[j]));
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

// produces a color a small distance in a random direction away from the given color in HSLuv space
// uses a gaussian distribution to produce a random vector
const randomNearbyColor = (color, delta = jnd * 2, resample = 5) => {
    const hsluv = hsluvFromColor(color);
    const vector = randomVector(3);

    const h = (hsluv[0] + vector[0] * delta) % 360; // hue wraps around

    let s = hsluv[1] + vector[1] * delta;
    if (s < 0 || s > 100) {
        vector[1] *= -1;
        s = hsluv[1] + vector[1] * delta;
    }

    let l = hsluv[2] + vector[2] * delta;
    if (l < 0 || l > 100) {
        vector[2] *= -1;
        l = hsluv[2] + vector[2] * delta;
    }

    const candidate = colorFromHsluv(h, s, l);

    // check if the new color is at least 1 jnd away from the original color
    // if not, resample up to n times
    if (distance(color, candidate) < jnd && resample > 0) {
        return randomNearbyColor(color, delta, resample - 1);
    }

    return candidate;
};

const convertToCvd = (color, cvdType, severity) => {
    const cvdRgb = simulateCvd(
        [color.srgb_linear.r, color.srgb_linear.g, color.srgb_linear.b],
        cvdType,
        severity
    );
    return new Color("srgb-linear", cvdRgb).to("srgb");
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

// Cost function including weights
const cost = (state) => {
    const energyWeight = 1.25;
    const rangeWeight = 1;
    const targetWeight = 0.75;
    const avoidWeight = 0.5;
    const contrastWeight = 0.25;

    const protanomalyWeight = 0.1;

    const deuteranomalyWeight = 0.5;

    const tritanomalyWeight = 0.05;

    const normalDistances = distances(state);

    const protanomalyDistances = distances(
        state.map((color) => convertToCvd(color, "Protanomaly", 50))
    );

    const deuteranomalyDistances = distances(
        state.map((color) => convertToCvd(color, "Protanomaly", 50))
    );

    const tritanomalyDistances = distances(
        state.map((color) => convertToCvd(color, "Protanomaly", 50))
    );

    const energyScore = 100 - average(normalDistances);
    const rangeScore = range(normalDistances);
    const targetScore = targetColors.length
        ? averageDistanceFromColors(state, targetColors)
        : 0;
    const avoidScore = avoidColors.length
        ? 100 - minDistanceFromColors(state, avoidColors)
        : 0;

    const protanomalyScore = 100 - average(protanomalyDistances);
    const deuteranomalyScore = 100 - average(deuteranomalyDistances);
    const tritanomalyScore = 100 - average(tritanomalyDistances);

    const maxPossibleContrast = 21; // Theoretical maximum contrast ratio in WCAG
    const minContrast = state.reduce(
        (acc, color) =>
            Math.min(color.contrast(backgroundColor, "wcag21"), acc),
        maxPossibleContrast
    );
    const contrastScore = 100 - (minContrast / maxPossibleContrast) * 100;

    return (
        energyWeight * energyScore +
        targetWeight * targetScore +
        rangeWeight * rangeScore +
        avoidWeight * avoidScore +
        protanomalyWeight * protanomalyScore +
        deuteranomalyWeight * deuteranomalyScore +
        tritanomalyWeight * tritanomalyScore +
        contrastWeight * contrastScore
    );
};

// the simulated annealing algorithm
const optimize = (n = 5) => {
    const colors = [];
    providedColors.forEach((color) => colors.push(new Color(color)));
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
Start colors: ${startColors.map((color) => color.toString({format:"hex"}))}
Start cost: ${startCost}
Final colors: ${colors.reduce((acc, color) => acc + `"${color.toString({format:"hex"})}" `, "")}
Final cost: ${cost(colors)}
Cost difference: ${cost(colors) - startCost}`);
    return colors;
};

const blue = new Color("blue");
const green = new Color("green");
const red = new Color("red");
const black = new Color("black");

const observable10 = [
    new Color("#4269d0"),
    new Color("#efb118"),
    new Color("#ff725c"),
    new Color("#6cc5b0"),
    new Color("#3ca951"),
    new Color("#ff8ab7"),
    new Color("#a463f2"),
    new Color("#97bbf5"),
    new Color("#9c6b4e"),
    new Color("#9498a0"),
];

optimize(10);