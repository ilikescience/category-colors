const { createColor } = require('../src/utils/paletteColor');
const { deltaE } = require('../src/utils/deltaE');

const colors = process.argv.slice(2);
const colorObjects = colors.reduce((acc, color) => {
    acc[color] = createColor(color);
    return acc;
}, {});

// build a graph of colors
const graph = {};
colors.forEach((color) => {
    graph[color] = [];
    colors.forEach((otherColor) => {
        if (color !== otherColor) {
            graph[color].push({
                color: otherColor,
                distance: deltaE(colorObjects[color], colorObjects[otherColor], { method: '2000' }),
            });
        }
    });
});

// Calculate the mean and standard deviation of the edge weights. This will be used to determine the "fitness" of a path.
const distances = [];
Object.keys(graph).forEach((color) => {
    graph[color].forEach((otherColor) => {
        distances.push(otherColor.distance);
    });
});

const mean = distances.reduce((a, b) => a + b) / distances.length;
const standardDeviation = Math.sqrt(
    distances.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) /
        distances.length
);

// Calculate the fitness of a path. The fitness should be low if the path is "good" and high if the path is "bad".
// "good" means that the path has a low standard deviation of edge weights, and a high mean of edge weights.
// "bad" means that the path has a high standard deviation of edge weights, and a low mean of edge weights.
const fitness = (path) => {
    const distances = [];
    for (let i = 0; i < path.length - 1; i++) {
        const color = path[i];
        const nextColor = path[i + 1];
        const distance = graph[color].find(
            (otherColor) => otherColor.color === nextColor
        ).distance;
        distances.push(distance);
    }
    const pathMean = distances.reduce((a, b) => a + b) / distances.length;
    const pathStandardDeviation = Math.sqrt(
        distances
            .map((x) => Math.pow(x - pathMean, 2))
            .reduce((a, b) => a + b) / distances.length
    );
    return pathStandardDeviation / pathMean;
};

// Generate a random path
const randomPath = (colors) => {
    const path = [colors[0]];
    const remainingColors = colors.slice(1);
    while (remainingColors.length > 0) {
        const randomColor = remainingColors.splice(
            Math.floor(Math.random() * remainingColors.length),
            1
        )[0];
        path.push(randomColor);
    }
    return path;
};

// Mutate a path by swapping two colors. always keep the first color the same.
const mutate = (path) => {
    const newPath = [...path];
    const index1 = Math.floor(Math.random() * (newPath.length - 1)) + 1;
    const index2 = Math.floor(Math.random() * (newPath.length - 1)) + 1;
    const temp = newPath[index1];
    newPath[index1] = newPath[index2];
    newPath[index2] = temp;
    return newPath;
};


// return the best path out of a and b
const best = (a, b) => {
    if (fitness(a) < fitness(b)) {
        return a;
    } else {
        return b;
    }
};

// use a genetic algorithm to find the best path
// print the fitness of the intial path, and the fitness of the best path found
const geneticAlgorithm = (colors) => {
    let bestPath = randomPath(colors);
    let bestFitness = fitness(bestPath);
    console.log("Initial fitness:", bestFitness);
    for (let i = 0; i < 100000; i++) {
        const newPath = mutate(bestPath);
        const newFitness = fitness(newPath);
        bestPath = best(bestPath, newPath);
        bestFitness = fitness(bestPath);
    }
    console.log("Best fitness:", bestFitness);
    return bestPath;
};

// print the best path
console.log(geneticAlgorithm(colors));
