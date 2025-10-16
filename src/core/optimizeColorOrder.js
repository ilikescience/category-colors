// return a set of arrays indicating the permutations of the order of the colors in state
// reject permutations that violate the fixedOrder property
const permutations = (state) => {
    let result = [];

    const permute = (arr, m = []) => {
        if (arr.length === 0) {
            // for every index, if that color in the state is fixed,
            // it must be in the same position in the permutation
            if (
                m.every((colorIndex, i) => {
                    return state.colors[i].fixedOrder ? m[i] === i : true;
                })
            ) {
                result.push(m);
            } else {
                return;
            }
        } else {
            for (let i = 0; i < arr.length; i++) {
                let curr = arr.slice();
                let next = curr.splice(i, 1);
                permute(curr.slice(), m.concat(next));
            }
        }
    };

    permute(state.colors.map((color, i) => i));

    return result;
};

const buildColorGraph = (state, config) => {
    const graph = [];
    state.colors.forEach((color, i) => {
        graph[i] = [];
        state.colors.forEach((otherColor, j) => {
            if (i !== j) {
                graph[i][j] = color.deltaE(otherColor, config.deltaEMethod);
            } else {
                graph[i][j] = 0;
            }
        });
    });
    return graph;
};

// Calculate the cost of a path. The cost should be low if the path is "good" and high if the path is "bad".
// "good" means that the path has a low standard deviation of edge weights, and a high mean of edge weights.
// "bad" means that the path has a high standard deviation of edge weights, and a low mean of edge weights.
const pathCost = (path, graph) => {
    let pathMean = 0;
    let pathStandardDeviation = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const distance = graph[path[i]][path[i + 1]];
        pathMean += distance;
        pathStandardDeviation += distance * distance;
    }
    pathMean /= path.length - 1;
    pathStandardDeviation = Math.sqrt(
        pathStandardDeviation / (path.length - 1) - pathMean * pathMean
    );
    return pathStandardDeviation / pathMean;
};

// optimize the color order of the state
// should preserve the order of any colors that have the fixedOrder property set to true
const optimizeColorOrder = (state, config) => {
    const graph = buildColorGraph(state, config);
    const bestPath = permutations(state).reduce(
        (bestPath, path) => (pathCost(path, graph) < pathCost(bestPath, graph) ? path : bestPath),
        // initialize the best path to be the identity permutation, ie [0, 1, 2, ...]
        Array(state.colors.length)
            .fill()
            .map((x, i) => i)
    );
    return bestPath.map((i) => state.colors[i]);
};

module.exports = {
    optimizeColorOrder,
};
