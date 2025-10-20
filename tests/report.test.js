const test = require('node:test');
const assert = require('node:assert/strict');
const { reportJndIssues } = require('../src/report/jnd');
const { createColor } = require('../src/utils/paletteColor');

test('reportJndIssues flags pairs below the JND threshold', () => {
    const palette = ['#ff0000', '#f10000', '#00ff00'];
    const report = reportJndIssues(palette, {
        jndThreshold: 10,
        distanceMethod: 'ciede2000',
        distanceSpace: 'lab65',
    });

    assert.equal(report.totalIssues, 1);
    assert.equal(report.tests.length, 1);
    assert.equal(report.tests[0].label, 'normal');
    assert.equal(report.tests[0].issueCount, 1);
    assert.equal(report.tests[0].issues[0].indexA, 0);
    assert.equal(report.tests[0].issues[0].indexB, 1);
    assert.ok(Array.isArray(report.tests[0].issues[0].colors));
    assert.equal(report.tests[0].issues[0].colors.length, 2);
});

test('reportJndIssues includes CVD simulations when provided', () => {
    const palette = [
        createColor('#ff0000'),
        createColor('#f10000'),
        createColor('#00ff00'),
    ];

    const report = reportJndIssues(palette, {
        jndThreshold: 15,
        distanceMethod: 'cie76',
        distanceSpace: 'lab65',
        cvdSimulations: [
            { type: 'protanomaly', severity: 1 },
            { type: 'deuteranomaly', severity: 0.5 },
        ],
    });

    assert.equal(report.tests.length, 3);
    assert.ok(report.tests.some((item) => item.label === 'normal'));
    assert.ok(report.tests.some((item) => item.label === 'protanomaly:1'));
    assert.ok(report.tests.some((item) => item.label === 'deuteranomaly:0.5'));
    report.tests.forEach((testCase) => {
        testCase.issues.forEach((issue) => {
            assert.equal(issue.colors.length, 2);
        });
    });
});
