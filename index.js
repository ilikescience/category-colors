const chroma = require("chroma-js");

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

// array of distances between all points in a color array
const distances = (colorArray) => {
    const distances = [];
    for (let i = 0; i < colorArray.length; i++) {
        for (let j = i + 1; j < colorArray.length; j++) {
            distances.push(distance(colorArray[i], colorArray[j]));
        }
    }
    return distances;
}

// get average of interger array
const average = (array) => array.reduce((a, b) => a + b) / array.length;

// get the distance between the highest and lowest values in an array
const range = (array) => {
    const sorted = array.sort((a, b) => a - b);
    return sorted[sorted.length - 1] - sorted[0];
}

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

const sigmoid = (x) => 1 / (1 + Math.abs(x));

const evaluateColorArray = (colorArray) => {
    const averageScore = average(distances(colorArray)); // higher average distance is better
    const rangeScore = range(distances(colorArray)); // lower range is better
    return {
        averageScore,
        rangeScore,
    };
};

// find n colors that are equidistant from each other
// using simulated annealing
const optimize = (n = 5) => {
    // initialize colors
    const colors = [];
    for (let i = 0; i < n; i++) {
        colors.push(randomColor());
    }

    // intialize hyperparameters
    let temperature = 1;
    const coolingRate = 0.001;
    const rangeWeight = 1;
    const averageWeight = 1;

    // iteration loop
    while (temperature > 0) {
        // for each color
        for (let i = 0; i < colors.length; i++) {
            // copy old colors
            const newColors = colors.map((color) => color);
            // move the current color randomly
            newColors[i] = randomNearbyColor(newColors[i]);

            // todo: figure out how to evaluate the new colors
        }

        // decrease temperature
        temperature -= coolingRate;
    }

    console.log(colors.map((color) => color.hex()));
    return colors;
};

optimize(5);