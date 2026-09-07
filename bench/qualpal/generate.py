"""Generate one QualPal palette and print it as JSON.

Reads a JSON request on stdin:

    {"n": 8, "h": [0, 360], "c": [0.2, 0.8], "l": [0.3, 0.9],
     "cvd": {"protan": 1.0, "deutan": 1.0, "tritan": 1.0}, "metric": "ciede2000"}

Calls the extension's `generate_palette_unified` rather than the documented
`qualpal.Qualpal` class. That is deliberate and load-bearing; see readme.md.
In qualpal 1.1.0 the Python class validates `cvd`, `metric` and `background`,
stores them, and then calls C++ entry points whose signatures accept none of
them, so every setting yields an identical palette. The unified entry point
takes and honours them.
"""

import json
import sys

import _qualpal


def main() -> int:
    req = json.load(sys.stdin)
    kwargs = {
        "n": int(req["n"]),
        "h_range": [float(v) for v in req["h"]],
        "c_range": [float(v) for v in req["c"]],
        "l_range": [float(v) for v in req["l"]],
    }
    if req.get("cvd"):
        kwargs["cvd"] = {k: float(v) for k, v in req["cvd"].items()}
    if req.get("metric"):
        kwargs["metric"] = req["metric"]

    hexes = _qualpal.generate_palette_unified(**kwargs)

    # A palette that ignored the cvd request would be a silent wrong answer, and
    # the only visible symptom would be numbers that look plausible. Prove the
    # option reached the optimizer by generating the same box without it: for
    # any n worth benchmarking the two must differ.
    if kwargs.get("cvd"):
        plain = _qualpal.generate_palette_unified(
            **{k: v for k, v in kwargs.items() if k != "cvd"}
        )
        if list(plain) == list(hexes):
            print(
                "qualpal ignored the cvd option: it returned the same palette "
                "with and without it. See bench/qualpal/readme.md.",
                file=sys.stderr,
            )
            return 2

    json.dump(list(hexes), sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
