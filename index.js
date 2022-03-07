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

// array of distances between colors after sorting by hue
const distances = (colorArray) => {
    const distanceArray = [];
    const sortedColors = sortByHue(colorArray);
    for (let i = 0; i < sortedColors.length; i++) {
        distanceArray.push(
            distance(
                sortedColors[(i + 1) % sortedColors.length],
                sortedColors[i]
            )
        );
    }
    return distanceArray;
};

// get average distances between colors in one array
const averageDistance = (colorArray) => {
    const distanceArray = distances(colorArray);
    return (
        distanceArray.reduce((sum, distance) => {
            return sum + distance;
        }) / distanceArray.length
    );
};

// get average variance of distances between colors in one array
const variance = (colorArray) => {
    const distanceArray = distances(colorArray);
    const average = averageDistance(colorArray);
    return distanceArray.reduce((sum, distance) => {
        return sum + Math.pow(distance - average, 2);
    });
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

const sigmoid = (x) => 1 / (1 + Math.abs(x));

const evaluateColorArray = (colorArray) => {
    const averageScore = sigmoid(averageDistance(colorArray)); // higher average distance is better
    const varianceScore = 1 - sigmoid(variance(colorArray)); // lower variance is better
    return {
        averageScore,
        varianceScore,
    };
};


// find n colors that are equidistant from each other
// using simulated annealing
const optimize = (n = 5) => {
    // initialize colors
    const colors = [];
    colors.push(chroma('#635bff'))
    for (let i = 1; i < n; i++) {
        colors.push(randomColor());
    }

    // intialize hyperparameters
    let temperature = 1;
    const coolingRate = 0.0001;
    const varianceWeight = 1;
    const averageWeight = 1;

    // iteration loop
    while (temperature > 0) {
        // get new colors
        const newColors = colors.map((color) => {
            return randomNearbyColor(color);
        });

        // get evaluation of new colors
        const newEvaluation = evaluateColorArray(newColors);
        // get evaluation of old colors
        const oldEvaluation = evaluateColorArray(colors);
        const varianceDiff = newEvaluation.variance - oldEvaluation.variance;
        const averageDiff = newEvaluation.average - oldEvaluation.average;

        // calculate acceptance probability
        const probability = Math.exp(
            -(
                varianceWeight * varianceDiff +
                averageWeight * averageDiff
            ) / temperature
        );

        // accept new colors with probability
        if (Math.random() < probability) {
            colors.forEach((color, i) => {
                colors[i] = newColors[i];
            });
        }

        // decrease temperature
        temperature -= coolingRate;
    }

    console.log(colors.map((color) => color.hex()));
    return colors;
};

optimize();
