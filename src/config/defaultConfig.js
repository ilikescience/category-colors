import { energy, range, jnd, similarity } from '../evaluators/index.js';

const createDefaultConfig = () => ({
    // The CVD terms model full dichromacy rather than anomalous trichromacy at
    // half severity, because optimizing the harder case carries the milder one.
    //
    // They are weighted far lower than the unimpaired term, which looks wrong
    // until you measure it: these terms saturate early. 2.0.x carried them at
    // 0.3/0.3/0.2/0.1 against an unimpaired weight of 0.3 — 60% of the
    // objective — and bought almost nothing for the last two thirds of that.
    // Measured over ten seeds at eight colors, moving to the weights below
    // raised the unimpaired minimum deltaE from 19.0 to 22.6 while the worst
    // case across all six conditions moved only 7.9 -> 7.7:
    //
    //   deuteranopia 16.1 -> 16.3   protanopia 16.2 -> 14.9
    //   tritanopia   17.2 -> 15.6   grayscale   7.9 ->  7.7
    //
    // Grayscale is not here. Lightness alone spans about 100 ΔE, so past five
    // or six colors no palette can separate every pair in it, and its term
    // pulled against the others without being met. Dropping it in 3.5.0 raised
    // every deficiency's minimum along with the unimpaired one (8 colors, 10
    // trials: unimpaired 24.3 -> 27.9, deuteranopia 15.0 -> 19.3, protanopia
    // 15.5 -> 17.2, tritanopia 16.9 -> 20.8). Add it back for print, at a low
    // weight. Lower the unimpaired `jnd` weight to trade ordinary separation
    // back for more CVD headroom.
    evalFunctions: [
        { function: energy, weight: 0.15 },
        { function: range, weight: 0.15 },
        { function: jnd, weight: 1 },
        {
            function: jnd,
            weight: 0.1,
            cvd: { type: 'protanopia', severity: 1 },
        },
        {
            function: jnd,
            weight: 0.1,
            cvd: { type: 'deuteranopia', severity: 1 },
        },
        {
            function: jnd,
            weight: 0.1,
            cvd: { type: 'tritanopia', severity: 1 },
        },
        { function: similarity, weight: 1 },
    ],
    coolingRate: 0.999,
    cutoff: 0.0001,
    maxIterations: 100000,
    colorDistance: {
        method: 'ciede2000',
    },
    colorSpace: {
        mode: 'okhsl',
        ranges: [
            [0, 360],   // hue
            [0.2, 0.8], // saturation
            [0.3, 0.9], // lightness
        ],
    },
    jnd: 20,
    maxMutationDistance: 0.15,
    minMutationDistance: 0.005,
    similarityTarget: [
        '#F1781E',
        '#D83F41',
        '#8F4CB3',
        '#215BEF',
        '#009919'
    ],
    initialTemperatureSamples: 100,
    initialAcceptanceRate: 0.95,
    colorCount: 8
});

export { createDefaultConfig };
