#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');
const {
    generatePalette,
    formatTextSummary,
    buildJsonSummary,
    toHexPalette,
} = require('../src/cli/generatePalette');

const printUsage = () => {
    console.log(`category-colors v${version}

Usage:
  category-colors run [options]
  category-colors --version
  category-colors --help

Options:
  -c, --config <path>   Path to a JS/JSON module exporting config overrides or a factory.
  -s, --state <path>    Path to a JS/JSON module exporting initial state overrides or palette array.
  -f, --format <type>   Output format: text (default), json, palette.
  -o, --output <path>   Write the generated output to the specified file instead of stdout.
      --no-order        Skip post-annealing color order optimization.
      --quiet           Disable progress logging during annealing.
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
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
};

main();
