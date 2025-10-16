/**
 * Automatically determines a good initial temperature for simulated annealing.
 * @param {object} initialState The starting state of the algorithm.
 * @param {object} config The main configuration object.
 * @param {number} numSamples The number of random neighbors to generate for the test.
 * @param {number} targetAcceptanceRate The desired probability (e.g., 0.95) of accepting a worse move at the start.
 * @returns {number} The calculated initial temperature.
 */

const { getNeighbor } = require('./getNeighbor');

const findInitialTemperature = (initialState, config, numSamples = 100, targetAcceptanceRate = 0.95) => {
    if (!Number.isFinite(initialState.cost)) {
        throw new Error('Initial state must have a finite cost before determining initial temperature.');
    }
    const positiveDeltas = [];
    const initialCost = initialState.cost;

    console.log(`Finding initial temperature over ${numSamples} samples...`);
    console.log(`Initial state cost: ${initialCost.toFixed(2)}`);

    for (let i = 0; i < numSamples; i++) {
        // We pass a dummy temperature of 1.0 to getNeighbor, as it's only used for mutation size.
        const candidateState = getNeighbor(initialState, config);
        const deltaCost = candidateState.cost - initialCost;

        if (deltaCost > 0) {
            positiveDeltas.push(deltaCost);
        }
    }

    if (positiveDeltas.length === 0) {
        // This is rare, but if all moves were improvements, return a default high temperature.
        console.log("All initial random moves were improvements. Using default temperature.");
        return 1000;
    }

    const avgDelta = positiveDeltas.reduce((sum, val) => sum + val, 0) / positiveDeltas.length;
    
    const initialTemp = -avgDelta / Math.log(targetAcceptanceRate);
    
    console.log(`Average cost increase (ΔE): ${avgDelta.toFixed(2)}`);
    console.log(`Target acceptance rate: ${targetAcceptanceRate * 100}%`);
    console.log(`Calculated Initial Temperature: ${initialTemp.toFixed(2)}`);

    return initialTemp;
};

module.exports = { findInitialTemperature };
