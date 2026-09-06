"""Score palettes with Colorgorical's Model.scorePalette, or make its samples.

Runs under Python 2.7 inside the Docker image (see Dockerfile).

    score.py            reads [[hex, ...], ...] on stdin, writes scores JSON
    score.py --samples  prints Colorgorical's own sample palettes as JSON,
                        the palette-making half of `run.py --makeSamples`
"""
import argparse
import itertools
import json
import sys

import numpy as np

sys.path.insert(0, 'src')
from model import model  # noqa: E402
from model import numpyColorgorical as npc  # noqa: E402
from model.util import convert  # noqa: E402

WEIGHTS = {"ciede2000": 1, "nameDifference": 1, "nameUniqueness": 1,
           "pairPreference": 1}


def hexToLab(h):
    h = h.lstrip('#')
    return convert.convertRGBToLab([int(h[i:i + 2], 16) for i in (0, 2, 4)])


def labToHex(lab):
    return '#%02x%02x%02x' % convert.convertLabToRGB(lab)


def snap(m, lab):
    """Nearest colour Colorgorical can score: Lab on a 5-unit grid, in sRGB."""
    grid = [int(5 * round(v / 5.0)) for v in lab]
    if npc.colorIndex(np.array(grid, dtype=float))[0] >= 0:
        return grid
    d = np.sum((m.colorSpaces[:, :3] - lab) ** 2, axis=1)
    return [int(v) for v in m.colorSpaces[np.argmin(d), :3]]


def score(m, hexes):
    labs = [snap(m, hexToLab(h)) for h in hexes]
    s = m.scorePalette(labs, weights=WEIGHTS)
    return {
        "input": hexes,
        "lab": labs,
        "scored": [labToHex(l) for l in labs],
        "min": s["minScores"],
        "pairs": [{"i": i, "j": j, "de": r[0], "nd": r[1], "pp": r[2]}
                  for (i, j), r in zip(s["pairIndexes"], s["scores"])],
        "nu": s["nuScores"].tolist(),
    }


def sampleWeights():
    """The 20 slider settings from src/makeSamples.py, verbatim."""
    ws = np.array(list(itertools.product([0, 0.5, 1], repeat=3)))
    ws = ws[np.sum(ws, axis=1) != 0.5, :]

    def isOk(row):
        values, counts = [list(r) for r in np.unique(row, return_counts=True)]
        if values == [0.5]:
            return False
        if 0 in values and 0.5 in values and \
                counts[values.index(0)] == 1 and counts[values.index(0.5)] == 2:
            return False
        return True
    return [w for w in ws if isOk(w)]


def samples(m, repeats, sizes):
    """Palette generation from MakeSamples.make, without the matplotlib plots."""
    def uniqueIdx(pals):
        idx = np.array([sorted(npc.colorIndex(c).astype(int)[0] for c in p)
                        for p in pals])
        b = np.ascontiguousarray(idx).view(
            np.dtype((np.void, idx.dtype.itemsize * idx.shape[1])))
        return np.unique(b, return_index=True)[1]

    def rep(size, weights):
        pals = np.array([m.makePreferablePalette(size, 10, weights=weights)
                         for _ in range(repeats)])
        pals = pals[uniqueIdx(pals)]
        while pals.shape[0] < repeats:
            more = np.array([m.makePreferablePalette(size, 10, weights=weights)
                             for _ in range(repeats - pals.shape[0])])
            pals = np.vstack((pals, more))
            pals = pals[uniqueIdx(pals)]
        return pals[:repeats].tolist()

    out = []
    for w in sampleWeights():
        weights = {"ciede2000": w[0], "nameDifference": w[1],
                   "nameUniqueness": 0.0, "pairPreference": w[2]}
        sys.stderr.write('weights %s\n' % json.dumps(weights))
        pals = {}
        for size in sizes:
            labs = rep(size, weights)
            pals[str(size)] = [{"lab": p, "hex": [labToHex(c) for c in p]}
                               for p in labs]
        out.append({"weights": weights, "palettes": pals})
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--samples', action='store_true')
    ap.add_argument('--repeats', type=int, default=10)
    ap.add_argument('--sizes', default='3,5,8')
    ap.add_argument('--seed', type=int)
    args = ap.parse_args()
    if args.seed is not None:
        np.random.seed(args.seed)

    m = model.Model()
    if args.samples:
        result = samples(m, args.repeats, [int(s) for s in args.sizes.split(',')])
    else:
        result = [score(m, p) for p in json.load(sys.stdin)]
    json.dump(result, sys.stdout)
    sys.stdout.write('\n')
