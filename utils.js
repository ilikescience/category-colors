// math helper functions

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
    let u = 0,
        v = 0;

    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();

    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

// generates a random n-dimensional vector with a length of 1
// useful for walking through color spaces randomly
const randomVector = (dimensions, length = 1) => {
    let vector = [];
    let vectorLength = 0;

    for (let i = 0; i < dimensions; i++) {
        vector.push(gaussianRandom());
        vectorLength += vector[i] ** 2;
    }

    vectorLength = Math.sqrt(vectorLength);

    for (let i = 0; i < dimensions; i++) {
        vector[i] /= vectorLength;
        vector[i] *= length;
    }

    return vector;
};

const degToRad = (deg) => deg * (Math.PI / 180);

const radToDeg = (rad) => rad * (180 / Math.PI);

const cylindricalToCartesian = (cylindrical) => {
    const [r, theta, z] = cylindrical;
    const x = r * Math.cos(degToRad(theta));
    const y = r * Math.sin(degToRad(theta));
    return [x, y, z];
};

const cartesianToCylindrical = (cartesian) => {
    const [x, y, z] = cartesian;
    const r = Math.sqrt(x * x + y * y);
    const theta = radToDeg(Math.atan2(y, x));
    return [r, theta, z];
};

const cartesianDistance = (a, b) => {
    return Math.sqrt(
        Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2)
    );
};


module.exports = {
    clamp,
    multiplyMatrices,
    gaussianRandom,
    randomVector,
    degToRad,
    radToDeg,
    cylindricalToCartesian,
    cartesianToCylindrical,
    cartesianDistance,
};
