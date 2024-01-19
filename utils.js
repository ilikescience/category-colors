// helper functions

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const multiplyMatrices = (m1, m2) => {
    var result = [];
    for (var i = 0; i < m1.length; i++) {
        result[i] = [];
        for (var j = 0; j < m2[0].length; j++) {
            var sum = 0;
            for (var k = 0; k < m1[0].length; k++) {
                sum += m1[i][k] * m2[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
};

// generates a random number with a gaussian distribution between -1 and 1
const gaussianRandom = () => {
    let u = 0, v = 0;

    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

// generates a random n-dimensional vector with a length of 1
// useful for walking through color spaces randomly
const randomVector = (dimensions) => {
    let vector = [];
    let length = 0;

    for (let i = 0; i < dimensions; i++) {
        vector.push(gaussianRandom());
        length += vector[i] * vector[i];
    }

    length = Math.sqrt(length);

    for (let i = 0; i < dimensions; i++) {
        vector[i] /= length;
    }

    return vector;
};


module.exports = {
    clamp,
    multiplyMatrices,
    gaussianRandom,
    randomVector
};
