#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { generatePalette, formatTextSummary, buildJsonSummary, toHexPalette, } from '../src/cli/generatePalette.js';
import { runReport, formatTextReport, } from '../src/cli/reportPalette.js';

const { version } = createRequire(import.meta.url)('../package.json');

const printUsage = () => {
    console.log(`category-colors v${version}

Usage:
  category-colors run [options]
  category-colors report [colors...] [options]
  category-colors --version
  category-colors --help

Run options:
  -c, --config <path>   Path to a JS/JSON module exporting config overrides or a factory.
  -s, --state <path>    Path to a JS/JSON module exporting initial state overrides or palette array.
  -f, --format <type>   Output format: text (default), json, palette.
  -o, --output <path>   Write the generated output to the specified file instead of stdout.
      --no-order        Skip post-annealing color order optimization.
      --quiet           Disable progress logging during annealing.

Report options (audit an existing palette for just-noticeable-difference issues):
  [colors...]              Hex colors to audit when --palette is not used.
  -p, --palette <path>     Path to a JS/JSON module exporting a colors array or state object.
  -m, --method <name>      Color-distance method (default ciede2000).
      --space <name>       Color space used for distance (default lab65).
  -t, --threshold <num>    JND threshold; pairs below it are flagged (default 25).
      --cvd <type:sev>     Add a CVD simulation, e.g. deuteranomaly:0.5 (repeatable).
      --palette-space <s>  Format reported colors in this space instead of hex.
      --pairs              Include every pair in JSON output, not just issues.
  -f, --format <type>      Output format: text (default), json.
  -o, --output <path>      Write the report to a file instead of stdout.
      --quiet              Suppress the "wrote output" message.

  -h, --help            Show this help message.
  -v, --version         Show CLI version.
`);
};

const parseRunOptions = (args) => {
    const options = {
        format: 'text',
        orderOptimization: true,
        quiet: false,
    };

    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        switch (arg) {
            case '-c':
            case '--config':
                i += 1;
                if (i >= args.length) {
                    throw new Error('Missing value for --config option.');
                }
                options.configPath = args[i];
                break;
            case '-s':
            case '--state':
                i += 1;
                if (i >= args.length) {
                    throw new Error('Missing value for --state option.');
                }
                options.statePath = args[i];
                break;
            case '-f':
            case '--format':
                i += 1;
                if (i >= args.length) {
                    throw new Error('Missing value for --format option.');
                }
                options.format = args[i].toLowerCase();
                if (!['text', 'json', 'palette'].includes(options.format)) {
                    throw new Error('Unsupported format. Choose from: text, json, palette.');
                }
                break;
            case '-o':
            case '--output':
                i += 1;
                if (i >= args.length) {
                    throw new Error('Missing value for --output option.');
                }
                options.outputPath = args[i];
                break;
            case '--no-order':
                options.orderOptimization = false;
                break;
            case '--quiet':
                options.quiet = true;
                break;
            case '-h':
            case '--help':
                options.help = true;
                break;
            default:
                if (arg.startsWith('-')) {
                    throw new Error(`Unknown option: ${arg}`);
                }
                throw new Error(`Unexpected argument: ${arg}`);
        }
    }

    return options;
};

const resolveOutputPath = (outputPath) => (path.isAbsolute(outputPath)
    ? outputPath
    : path.resolve(process.cwd(), outputPath));

const writeOutput = (outputPath, content, { format, quiet }) => {
    const absolutePath = resolveOutputPath(outputPath);
    fs.writeFileSync(absolutePath, content);
    if (!quiet) {
        console.error(`Wrote ${format} output to ${absolutePath}`);
    }
};

const renderResult = (format, initialState, finalState) => {
    switch (format) {
        case 'json':
            return `${JSON.stringify(buildJsonSummary(initialState, finalState), null, 2)}\n`;
        case 'palette':
            return `${toHexPalette(finalState.colors).join('\n')}\n`;
        case 'text':
        default:
            return `${formatTextSummary(initialState, finalState)}\n`;
    }
};

const runCommand = (args) => {
    const options = parseRunOptions(args);
    if (options.help) {
        printUsage();
        return;
    }

    const { initialState, finalState } = generatePalette({
        configPath: options.configPath,
        statePath: options.statePath,
        orderOptimization: options.orderOptimization,
        logProgress: !options.quiet,
    });

    const output = renderResult(options.format, initialState, finalState);
    if (options.outputPath) {
        writeOutput(options.outputPath, output, options);
    } else {
        process.stdout.write(output);
    }
};

const parseCvdSimulation = (value) => {
    const [type, severityRaw] = value.split(':');
    if (!type) {
        throw new Error(`Invalid --cvd value: ${value}. Expected <type> or <type:severity>.`);
    }
    const severity = severityRaw ? Number(severityRaw) : 1;
    if (Number.isNaN(severity)) {
        throw new Error(`Invalid CVD severity in --cvd value: ${value}.`);
    }
    return { type, severity };
};

const parseReportOptions = (args) => {
    const options = {
        format: 'text',
        quiet: false,
        distanceMethod: 'ciede2000',
        distanceSpace: 'lab65',
        jndThreshold: 25,
        cvdSimulations: [],
        colors: [],
        includePairs: false,
    };

    const nextValue = (args, i, name) => {
        if (i + 1 >= args.length) {
            throw new Error(`Missing value for ${name} option.`);
        }
        return args[i + 1];
    };

    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        switch (arg) {
            case '-p':
            case '--palette':
                options.palettePath = nextValue(args, i, '--palette');
                i += 1;
                break;
            case '-m':
            case '--method':
                options.distanceMethod = nextValue(args, i, '--method');
                i += 1;
                break;
            case '--space':
                options.distanceSpace = nextValue(args, i, '--space');
                i += 1;
                break;
            case '-t':
            case '--threshold': {
                const raw = nextValue(args, i, '--threshold');
                const threshold = Number(raw);
                if (Number.isNaN(threshold)) {
                    throw new Error(`Invalid --threshold value: ${raw}.`);
                }
                options.jndThreshold = threshold;
                i += 1;
                break;
            }
            case '--cvd':
                options.cvdSimulations.push(parseCvdSimulation(nextValue(args, i, '--cvd')));
                i += 1;
                break;
            case '--pairs':
                options.includePairs = true;
                break;
            case '--palette-space':
                options.paletteSpace = nextValue(args, i, '--palette-space');
                i += 1;
                break;
            case '-f':
            case '--format':
                options.format = nextValue(args, i, '--format').toLowerCase();
                if (!['text', 'json'].includes(options.format)) {
                    throw new Error('Unsupported format. Choose from: text, json.');
                }
                i += 1;
                break;
            case '-o':
            case '--output':
                options.outputPath = nextValue(args, i, '--output');
                i += 1;
                break;
            case '--quiet':
                options.quiet = true;
                break;
            case '-h':
            case '--help':
                options.help = true;
                break;
            default:
                if (arg.startsWith('-')) {
                    throw new Error(`Unknown option: ${arg}`);
                }
                options.colors.push(arg);
                break;
        }
    }

    return options;
};

const renderReport = (format, report, context) => {
    if (format === 'json') {
        return `${JSON.stringify(report, null, 2)}\n`;
    }
    return `${formatTextReport(report, context)}\n`;
};

const reportCommand = (args) => {
    const options = parseReportOptions(args);
    if (options.help) {
        printUsage();
        return;
    }

    const { report, colorCount } = runReport({
        palettePath: options.palettePath,
        colors: options.colors,
        distanceMethod: options.distanceMethod,
        distanceSpace: options.distanceSpace,
        jndThreshold: options.jndThreshold,
        cvdSimulations: options.cvdSimulations,
        paletteSpace: options.paletteSpace,
        includePairs: options.includePairs,
    });

    const output = renderReport(options.format, report, {
        colorCount,
        jndThreshold: options.jndThreshold,
        distanceMethod: options.distanceMethod,
        distanceSpace: options.distanceSpace,
    });
    if (options.outputPath) {
        writeOutput(options.outputPath, output, options);
    } else {
        process.stdout.write(output);
    }
};

const main = () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        printUsage();
        return;
    }

    if (args.includes('-h') || args.includes('--help')) {
        printUsage();
        return;
    }

    if (args.includes('-v') || args.includes('--version') || args[0] === 'version') {
        console.log(version);
        return;
    }

    const [command, ...rest] = args;
    try {
        switch (command) {
            case 'run':
                runCommand(rest);
                break;
            case 'report':
                reportCommand(rest);
                break;
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
};

main();
