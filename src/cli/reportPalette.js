import { reportJndIssues } from '../report/jnd.js';
import { resolveModule } from './generatePalette.js';

const extractColors = (loaded) => {
    if (Array.isArray(loaded)) {
        return loaded;
    }
    if (loaded && typeof loaded === 'object' && Array.isArray(loaded.colors)) {
        return loaded.colors;
    }
    throw new Error('Palette file must export an array of colors or an object with a `colors` array.');
};

const loadPaletteColors = ({ palettePath, colors } = {}) => {
    if (Array.isArray(colors) && colors.length > 0) {
        return colors;
    }
    if (palettePath) {
        return extractColors(resolveModule(palettePath));
    }
    throw new Error('No palette provided. Pass colors as arguments or use --palette <path>.');
};

const runReport = ({
    palettePath,
    colors,
    distanceMethod,
    distanceSpace,
    jndThreshold,
    cvdSimulations,
    paletteSpace,
    includePairs = false,
} = {}) => {
    const palette = loadPaletteColors({ palettePath, colors });
    const report = reportJndIssues(palette, {
        distanceMethod,
        distanceSpace,
        jndThreshold,
        cvdSimulations,
        paletteSpace,
        // Off by default: the text output only ever prints issues, and every
        // passing pair in the JSON is weight nobody asked for.
        includePairs,
    });
    return { report, colorCount: palette.length };
};

const formatTest = (test) => {
    const lines = [
        `${test.label} — ${test.description}`,
        `  ${test.issueCount} issue${test.issueCount === 1 ? '' : 's'}`,
    ];
    if (test.issues.length === 0) {
        lines.push('  (no pairs below threshold)');
    } else {
        test.issues.forEach((issue) => {
            const [colorA, colorB] = issue.colors;
            lines.push(`  [${issue.indexA}] ${colorA}  ↔  [${issue.indexB}] ${colorB}   ΔE ${issue.deltaE}`);
        });
    }
    return lines.join('\n');
};

const formatTextReport = (report, context = {}) => {
    const { colorCount, jndThreshold, distanceMethod, distanceSpace } = context;
    const header = [
        `JND report — ${colorCount} colors, threshold ${jndThreshold} (${distanceMethod} / ${distanceSpace})`,
        `Total issues: ${report.totalIssues}`,
    ].join('\n');
    return [header, ...report.tests.map(formatTest)].join('\n\n');
};

export { runReport, formatTextReport };
