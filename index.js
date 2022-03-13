const chroma = require("chroma-js");

const stripeColors = [
    "#f5fbff",
    "#d6ecff",
    "#a4cdfe",
    "#7dabf8",
    "#6c8eef",
    "#5469d4",
    "#3d4eac",
    "#2f3d89",
    "#212d63",
    "#131f41",
    "#efffed",
    "#cbf4c9",
    "#85d996",
    "#33c27f",
    "#1ea672",
    "#09825d",
    "#0e6245",
    "#0d4b3b",
    "#0b3733",
    "#082429",
    "#fcf9e9",
    "#f8e5b9",
    "#efc078",
    "#e5993e",
    "#d97917",
    "#bb5504",
    "#983705",
    "#762b0b",
    "#571f0d",
    "#3a1607",
    "#fff8f5",
    "#fde2dd",
    "#fbb5b2",
    "#fa8389",
    "#ed5f74",
    "#cd3d64",
    "#a41c4e",
    "#80143f",
    "#5e1039",
];

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

// put colors in hue order
const sortByHue = (colorArray) => {
    return colorArray.sort((a, b) => {
        return a.hsl()[0] - b.hsl()[0];
    });
};

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

// average of distances between array of colors and stripe colors
const averageDistanceFromStripeColors = (colors) => {
    const distances = colors.map((c) =>
        distance(c, getClosestColor(c, stripeColors))
    );
    return average(distances);
};

const cost = (state) => {
    const rangeWeight = 1;
    const averageWeight = 1;
    const stripeWeight = 2;

    const theseDistances = distances(state);

    const rangeScore = range(theseDistances); // lower is better
    const averageScore = 100 - average(theseDistances); // higher is better

    const stripeScore = averageDistanceFromStripeColors(state); // lower is better

    return (
        rangeWeight * rangeScore +
        averageWeight * averageScore +
        stripeWeight * stripeScore
    );
};

// find n colors that are equidistant from each other
// using simulated annealing
const optimize = (n = 5) => {
    // initialize colors
    const colors = [chroma('#635bff')];
    for (let i = 1; i < n; i++) {
        colors.push(randomColor());
    }

    // intialize hyperparameters
    let temperature = 1000;
    const coolingRate = 0.99;
    const cutoff = 0.0001;

    // iteration loop
    while (temperature > cutoff) {
        // for each color
        for (let i = 0; i < colors.length; i++) {
            // copy old colors
            const newColors = colors.map((color) => color);
            // move the current color randomly
            newColors[i] = randomNearbyColor(newColors[i]);

            const delta = cost(newColors) - cost(colors);
            const probability = Math.exp(-delta / temperature);
            if (Math.random() < probability) {
                colors[i] = newColors[i];
            }
        }

        console.log(cost(colors));

        // decrease temperature
        temperature *= coolingRate;
    }

    console.log(colors.map((color) => color.hex()));
    return colors;
};

optimize(5);