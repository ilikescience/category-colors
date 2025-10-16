const saliencies = require('./saliencies.json');

Array.prototype.isEqualToArray = function (array) {
    if (!array) return false;
    if (this.length != array.length) return false;
    for (var i = 0, l = this.length; i < l; i++) {
        if (this[i] instanceof Array && array[i] instanceof Array) {
            if (!this[i].isEqualToArray(array[i])) return false;
        } else if (this[i] != array[i]) {
            return false;
        }
    }
    return true;
};

const saliency = (color) => {
    // saliency data is in lab-d65, rounded to the nearest 5
    const lab = color.to('lab-d65').coords.map((x) => Math.round(x / 5) * 5);
    const datum = saliencies.find((item) => {
        return item.colorValue.isEqualToArray(lab);
    });
    return datum.saliency;
};

const evaluateSaliency = (state) => {
    const saliencies = state.colors.map((color) => saliency(color));
    return saliencies.reduce((a, b) => a + b) / saliencies.length;
}

module.exports = evaluateSaliency;
