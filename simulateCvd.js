// Algorithm for simulating a color as it may appear to a person with color deficiency
// based on Machado et al. (2009) "A Physiologically-based Model for Simulation of Color Vision Deficiency"
// http://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html

const { clamp, multiplyMatrices } = require('./utils');

// Pre-computed matrices
//
// protanomaly, deuteranomaly, and tritanomaly matrices represent anomalous trichromacy,
// from table 1 in machado et al., where severity is 0.5
//
// protanopia, deuteranopia, and tritanopia matrices represent dichromacy,
// from table 1 in machado et al., where severity is 1.0

const identity = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
];

const protanomaly = [
    [0.458064, 0.679578, -0.137642],
    [0.092785, 0.846313, 0.060902],
    [-0.007494, -0.016807, 1.024301],
];

const deuteranomaly = [
    [0.547494, 0.607765, -0.155259],
    [0.181692, 0.781742, 0.036566],
    [-0.01041, 0.027275, 0.983136],
];

const tritanomaly = [
    [1.017277, 0.027029, -0.044306],
    [-0.006113, 0.958479, 0.047634],
    [0.006379, 0.248708, 0.744913],
];

const protanopia = [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
];

const deuteranopia = [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
];

const tritanopia = [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
];

const simulateCvd = (rgb, cvdType) => {
    const rgbMatrix = [[rgb[0] * 255], [rgb[1] * 255], [rgb[2] * 255]];

    let cvdMatrix;
    switch (cvdType) {
        case 'protanomaly':
            cvdMatrix = protanomaly;
            break;
        case 'deuteranomaly':
            cvdMatrix = deuteranomaly;
            break;
        case 'tritanomaly':
            cvdMatrix = tritanomaly;
            break;
        case 'protanopia':
            cvdMatrix = protanopia;
            break;
        case 'deuteranopia':
            cvdMatrix = deuteranopia;
            break;
        case 'tritanopia':
            cvdMatrix = tritanopia;
            break;
        default:
            cvdMatrix = identity;
    }

    const resultMatrix = multiplyMatrices(cvdMatrix, rgbMatrix);

    return [
        clamp(resultMatrix[0][0] / 255, 0, 1),
        clamp(resultMatrix[1][0] / 255, 0, 1),
        clamp(resultMatrix[2][0] / 255, 0, 1),
    ];
};

module.exports = simulateCvd;
