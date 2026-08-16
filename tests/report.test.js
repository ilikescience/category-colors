import test from 'node:test';
import assert from 'node:assert/strict';
import { reportJndIssues } from '../src/report/jnd.js';
import { createColor } from '../src/utils/paletteColor.js';

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

test('reportJndIssues returns every pair alongside the flagged subset', () => {
    const palette = ['#ff0000', '#f10000', '#00ff00', '#0000ff'];
    const report = reportJndIssues(palette, {
        jndThreshold: 10,
        distanceMethod: 'ciede2000',
        distanceSpace: 'lab65',
    });

    const [normal] = report.tests;
    assert.equal(normal.pairs.length, 6, 'four colors make six pairs');
    assert.equal(normal.issues.length, normal.issueCount);
    normal.issues.forEach((issue) => {
        assert.ok(normal.pairs.includes(issue), 'issues should be drawn from pairs');
        assert.ok(issue.deltaE < 10);
    });
    normal.pairs.forEach((pair) => {
        assert.equal(pair.colors.length, 2);
        assert.ok(Number.isFinite(pair.deltaE));
    });
});

test('includePairs:false drops pairs but keeps issues', () => {
    const palette = ['#ff0000', '#f10000', '#00ff00', '#0000ff'];
    const options = { jndThreshold: 10, distanceMethod: 'ciede2000', distanceSpace: 'lab65' };

    const full = reportJndIssues(palette, options);
    const lean = reportJndIssues(palette, { ...options, includePairs: false });

    assert.equal(lean.tests[0].pairs, undefined);
    assert.equal(lean.totalIssues, full.totalIssues);
    assert.deepEqual(lean.tests[0].issues, full.tests[0].issues);
    assert.ok(
        JSON.stringify(lean).length < JSON.stringify(full).length,
        'dropping pairs should shrink the serialized report'
    );
});

test('each color is formatted once per test, not once per pair', () => {
    // Formatting inside the pair loop re-converts each color n-1 times. The
    // observable consequence is that both entries for a given index are the
    // identical string, so compare across pairs that share one.
    const palette = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
    const report = reportJndIssues(palette, { jndThreshold: 0, paletteSpace: 'oklch' });
    const { pairs } = report.tests[0];

    const byIndex = new Map();
    for (const pair of pairs) {
        for (const [index, formatted] of [
            [pair.indexA, pair.colors[0]],
            [pair.indexB, pair.colors[1]],
        ]) {
            if (byIndex.has(index)) {
                assert.equal(byIndex.get(index), formatted, `index ${index} formatted twice`);
            }
            byIndex.set(index, formatted);
        }
    }
    assert.equal(byIndex.size, palette.length);
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
