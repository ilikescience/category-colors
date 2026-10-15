/**
 * Automatically determines a good initial temperature for simulated annealing.
 * @param {object} initialState The starting state of the algorithm.
 * @param {object} config The main configuration object.
 * @param {number} numSamples The number of random neighbors to generate for the test.
 * @param {number} targetAcceptanceRate The desired probability (e.g., 0.95) of accepting a worse move at the start.
 * @param {() => number} random Source of randomness for the sampled mutations.
 * @returns {number} The calculated initial temperature.
 */

import { getNeighbor } from './getNeighbor.js';

const findInitialTemperature = (initialState, config, numSamples = 100, targetAcceptanceRate = 0.95, random = Math.random) => {
    if (!Number.isFinite(initialState.cost)) {
        throw new Error('Initial state must have a finite cost before determining initial temperature.');
    }
    const positiveDeltas = [];
    const initialCost = initialState.cost;
    const log = (...args) => {
        if (config.logProgress !== false) {
            console.log(...args);
        }
    };

    log(`Finding initial temperature over ${numSamples} samples...`);
    log(`Initial state cost: ${initialCost.toFixed(2)}`);

    for (let i = 0; i < numSamples; i++) {
        // getNeighbor takes full-size steps here: prepareInitialState samples
        // with temperature and initialTemperature both 1.
        const candidateState = getNeighbor(initialState, config, random);
        const deltaCost = candidateState.cost - initialCost;

        if (deltaCost > 0) {
            positiveDeltas.push(deltaCost);
        }
    }

    if (positiveDeltas.length === 0) {
        // This is rare, but if all moves were improvements, return a default high temperature.
        log("All initial random moves were improvements. Using default temperature.");
        return 1000;
    }

    // The median, not the mean: jnd scores (jnd / d)^4, so a few near-collisions
    // give deltas many orders of magnitude above the rest, and a mean set by
    // them made every early move a coin flip.
    positiveDeltas.sort((a, b) => a - b);
    const middle = positiveDeltas.length / 2;
    const medianDelta = positiveDeltas.length % 2
        ? positiveDeltas[Math.floor(middle)]
        : (positiveDeltas[middle - 1] + positiveDeltas[middle]) / 2;

    const initialTemp = -medianDelta / Math.log(targetAcceptanceRate);

    log(`Median cost increase: ${medianDelta.toFixed(2)}`);
    log(`Target acceptance rate: ${targetAcceptanceRate * 100}%`);
    log(`Calculated Initial Temperature: ${initialTemp.toFixed(2)}`);

    return initialTemp;
};

export { findInitialTemperature };
