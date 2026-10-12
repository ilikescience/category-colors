import { differenceCiede2000, differenceCie76, differenceCie94, differenceCmc, differenceEuclidean, } from 'culori';
import { convertMemoized, memoFor } from './colorMemo.js';

const normalizeMethod = (method = 'ciede2000') => {
    if (method === 'ciede2000') {
        return method;
    }
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

const createDifferenceFunction = (method, options = {}) => {
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

// The space each culori difference function converts its inputs into before
// measuring. Handing it colors already in that space makes culori's converter
// return them untouched, so the distance is computed from exactly the same
// coordinates; only the conversion is skipped.
const comparisonSpace = (method, options) =>
    method === 'euclidean' ? options.space || 'lab65' : 'lab65';

// Only the options a method reads go into its key, so the common case builds
// no string at all.
const metricKey = (method, options) => {
    if (method === 'euclidean') return `euclidean|${options.space || 'lab65'}`;
    if (method === 'cmc') return `cmc|${options.cmc ? JSON.stringify(options.cmc) : ''}`;
    return method;
};

// One record per metric: its culori function, the space it measures in, and
// a slot number for its cached distances.
const METRICS = new Map();

const getMetric = (method, options) => {
    const key = metricKey(method, options);
    let metric = METRICS.get(key);
    if (!metric) {
        metric = {
            diff: createDifferenceFunction(method, options),
            space: comparisonSpace(method, options),
            slot: METRICS.size,
        };
        METRICS.set(key, metric);
    }
    return metric;
};

// A distance is stored on the newer of the two colors' memos, keyed by the
// older one's id; see colorMemo.js. The optimizer creates a candidate color
// every step and keeps few of them, and this way a rejected candidate takes
// its distances with it when it is collected, while a surviving color only
// ever holds entries for the handful of colors it was compared against.
// Keying by memo rather than by color means a color edited in place gets a
// new memo and a new id, so nothing computed from its old value is reused.
//
// Pairs are ordered (the two directions are separate maps) because evaluators
// ask in both orders and culori's arithmetic is not promised to be symmetric
// to the last bit.
const cachedDistances = (memoA, memoB, slot) => {
    const newer = memoA.id > memoB.id ? memoA : memoB;
    const byMetric = (newer.distances ??= []);
    const maps = (byMetric[slot] ??= [new Map(), new Map()]);
    return maps[newer === memoA ? 0 : 1];
};

const distanceBetween = (colorA, colorB, memoA, memoB, metric) => {
    const { diff, space, slot } = metric;
    if (!memoA || !memoB) {
        return diff(convertMemoized(colorA, memoA, space), convertMemoized(colorB, memoB, space));
    }
    const distances = cachedDistances(memoA, memoB, slot);
    const olderId = memoA.id > memoB.id ? memoB.id : memoA.id;
    let distance = distances.get(olderId);
    if (distance === undefined) {
        distance = diff(convertMemoized(colorA, memoA, space), convertMemoized(colorB, memoB, space));
        distances.set(olderId, distance);
    }
    return distance;
};

const deltaE = (colorA, colorB, options = {}) =>
    distanceBetween(
        colorA,
        colorB,
        memoFor(colorA),
        memoFor(colorB),
        getMetric(normalizeMethod(options.method), options)
    );

/**
 * deltaE between colors of one palette, by index. For evaluators that measure
 * every pair: the metric and each color's memo are resolved once here rather
 * than once per pair, which is most of the cost of a cached distance. The
 * palette must not be edited while the returned function is in use.
 */
const paletteDeltaE = (colors, options = {}) => {
    const metric = getMetric(normalizeMethod(options.method), options);
    const memos = colors.map(memoFor);
    return (i, j) => distanceBetween(colors[i], colors[j], memos[i], memos[j], metric);
};

export { deltaE, paletteDeltaE };
