const api = require('./src');
const {
    generatePalette,
    formatTextSummary,
    buildJsonSummary,
    toHexPalette,
} = require('./src/cli/generatePalette');

const run = (options = {}) => {
    const { initialState, finalState } = generatePalette(options);
    console.log(formatTextSummary(initialState, finalState));
    return finalState;
};

if (require.main === module) {
    run();
}

module.exports = {
    run,
    ...api,
    cli: {
        generatePalette,
        formatTextSummary,
        buildJsonSummary,
        toHexPalette,
    },
};
