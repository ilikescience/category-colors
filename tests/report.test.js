const test = require('node:test');
const assert = require('node:assert/strict');
const Color = require('colorjs.io').default;

const { reportJndIssues } = require('../src/report/jnd');

test('reportJndIssues flags pairs below the JND threshold', () => {
    const palette = ['#ff0000', '#f10000', '#00ff00'];
    const report = reportJndIssues(palette, {
        jndThreshold: 10,
        deltaEMethod: '2000',
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
        new Color('#ff0000'),
        new Color('#f10000'),
        new Color('#00ff00'),
    ];

    const report = reportJndIssues(palette, {
        jndThreshold: 15,
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
