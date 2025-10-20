const {
    differenceCiede2000,
    differenceCie76,
    differenceCie94,
    differenceCmc,
    differenceEuclidean,
} = require('culori');

const normalizeMethod = (method = 'ciede2000') => {
    const value = method.toLowerCase();
    switch (value) {
        case '2000':
            return 'ciede2000';
        case '76':
        case 'cie76':
            return 'cie76';
        case '94':
        case 'cie94':
            return 'cie94';
        case 'cmc':
            return 'cmc';
        case 'euclidean':
            return 'euclidean';
        case 'ciede2000':
            return 'ciede2000';
        default:
            return value;
    }
};

const getDifferenceFunction = (method, options = {}) => {
    switch (method) {
        case 'ciede2000':
            return differenceCiede2000();
        case 'cie76':
            return differenceCie76();
        case 'cie94':
            return differenceCie94();
        case 'cmc':
            return differenceCmc(options.cmc);
        case 'euclidean':
            return differenceEuclidean(options.space || 'lab65');
        default:
            throw new Error(`Unsupported deltaE method: ${method}`);
    }
};

const deltaE = (colorA, colorB, options = {}) => {
    const method = normalizeMethod(options.method);
    const diff = getDifferenceFunction(method, options);
    return diff(colorA, colorB);
};

module.exports = {
    deltaE,
};
