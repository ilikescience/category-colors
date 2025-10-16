// Helper utilities shared across tests.

/**
 * Temporarily overrides Math.random with a deterministic sequence.
 * Values are consumed in order; if the sequence runs out, the last
 * value is reused. The override is removed after `fn` finishes.
 * @param {number[]} values sequence of numbers in [0, 1)
 * @param {Function} fn callback to execute with mocked randomness
 * @returns {*} whatever `fn` returns
 */
const withMockedRandom = (values, fn) => {
    const originalRandom = Math.random;
    let index = 0;
    Math.random = () => {
        if (values.length === 0) {
            return 0.5;
        }
        if (index < values.length) {
            return values[index++];
        }
        return values[values.length - 1];
    };
    try {
        return fn();
    } finally {
        Math.random = originalRandom;
    }
};

module.exports = {
    withMockedRandom,
};
