import { energy, range, jnd, similarity } from '../evaluators/index.js';

const createDefaultConfig = () => ({
    // The CVD terms model full dichromacy rather than anomalous trichromacy at
    // half severity. Optimizing the harder case carries the milder one, and it
    // is what the numbers improved on: measured over ten seeds at eight colors,
    // moving from anomaly-at-0.5 to dichromacy lifted the minimum deltaE under
    // deuteranopia from 8.9 to 20.3 and under protanopia from 11.7 to 19.9,
    // for about one point of unimpaired separation.
    //
    // Weights are deliberately unequal. Tritanopia is rarer than the red-green
    // deficiencies, and grayscale is a print concern rather than a vision one,
    // so both sit below them. Grayscale is held low on evidence: past about
    // 0.05 its own score stops improving and it only takes separation from the
    // others. Raise the unimpaired `jnd` weight to trade CVD headroom back for
    // ordinary separation.
    evalFunctions: [
        { function: energy, weight: 0.15 },
        { function: range, weight: 0.15 },
        { function: jnd, weight: 0.3 },
        {
            function: jnd,
            weight: 0.3,
            cvd: { type: 'protanopia', severity: 1 },
        },
        {
            function: jnd,
            weight: 0.3,
            cvd: { type: 'deuteranopia', severity: 1 },
        },
        {
            function: jnd,
            weight: 0.2,
            cvd: { type: 'tritanopia', severity: 1 },
        },
        {
            function: jnd,
            weight: 0.1,
            cvd: { type: 'grayscale', severity: 1 },
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
