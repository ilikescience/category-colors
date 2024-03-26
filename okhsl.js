//Copyright (c) 2021 Björn Ottosson

// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// Modifications:
// Normalized everything to the range [0, 1] instead of [0, 255]
// Handled cases where r, g, b are all 0 or 1

function rgb_to_hsl(r, g, b) {
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s;
    let l = (max + min) / 2;

    if (max == min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return [h, s, l];
}

function hsl_to_rgb(h, s, l) {
    let r, g, b;

    if (s == 0) {
        r = g = b = l;
    } else {
        function hue_to_rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue_to_rgb(p, q, h + 1 / 3);
        g = hue_to_rgb(p, q, h);
        b = hue_to_rgb(p, q, h - 1 / 3);
    }

    return [r, g, b];
}

function rgb_to_hsv(r, g, b) {
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s;
    let v = max;

    let d = max - min;
    s = max == 0 ? 0 : d / max;

    if (max == min) {
        h = 0; // achromatic
    } else {
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return [h, s, v];
}

function hsv_to_rgb(h, s, v) {
    let r, g, b;

    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }

    return [r, g, b];
}

function srgb_transfer_function(a) {
    return 0.0031308 >= a ? 12.92 * a : 1.055 * Math.pow(a, 0.4166666666666667) - 0.055;
}

function srgb_transfer_function_inv(a) {
    return 0.04045 < a ? Math.pow((a + 0.055) / 1.055, 2.4) : a / 12.92;
}

function linear_srgb_to_oklab(r, g, b) {
    let l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    let m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    let s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

    let l_ = Math.cbrt(l);
    let m_ = Math.cbrt(m);
    let s_ = Math.cbrt(s);

    return [
        0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    ];
}

function oklab_to_linear_srgb(L, a, b) {
    let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    let s_ = L - 0.0894841775 * a - 1.291485548 * b;

    let l = l_ * l_ * l_;
    let m = m_ * m_ * m_;
    let s = s_ * s_ * s_;

    return [
        +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
}

function toe(x) {
    const k_1 = 0.206;
    const k_2 = 0.03;
    const k_3 = (1 + k_1) / (1 + k_2);

    return 0.5 * (k_3 * x - k_1 + Math.sqrt((k_3 * x - k_1) * (k_3 * x - k_1) + 4 * k_2 * k_3 * x));
}

function toe_inv(x) {
    const k_1 = 0.206;
    const k_2 = 0.03;
    const k_3 = (1 + k_1) / (1 + k_2);
    return (x * x + k_1 * x) / (k_3 * (x + k_2));
}

// Finds the maximum saturation possible for a given hue that fits in sRGB
// Saturation here is defined as S = C/L
// a and b must be normalized so a^2 + b^2 == 1
function compute_max_saturation(a, b) {
    // Max saturation will be when one of r, g or b goes below zero.

    // Select different coefficients depending on which component goes below zero first
    let k0, k1, k2, k3, k4, wl, wm, ws;

    if (-1.88170328 * a - 0.80936493 * b > 1) {
        // Red component
        k0 = +1.19086277;
        k1 = +1.76576728;
        k2 = +0.59662641;
        k3 = +0.75515197;
        k4 = +0.56771245;
        wl = +4.0767416621;
        wm = -3.3077115913;
        ws = +0.2309699292;
    } else if (1.81444104 * a - 1.19445276 * b > 1) {
        // Green component
        k0 = +0.73956515;
        k1 = -0.45954404;
        k2 = +0.08285427;
        k3 = +0.1254107;
        k4 = +0.14503204;
        wl = -1.2684380046;
        wm = +2.6097574011;
        ws = -0.3413193965;
    } else {
        // Blue component
        k0 = +1.35733652;
        k1 = -0.00915799;
        k2 = -1.1513021;
        k3 = -0.50559606;
        k4 = +0.00692167;
        wl = -0.0041960863;
        wm = -0.7034186147;
        ws = +1.707614701;
    }

    // Approximate max saturation using a polynomial:
    let S = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b;

    // Do one step Halley's method to get closer
    // this gives an error less than 10e6, except for some blue hues where the dS/dh is close to infinite
    // this should be sufficient for most applications, otherwise do two/three steps

    let k_l = +0.3963377774 * a + 0.2158037573 * b;
    let k_m = -0.1055613458 * a - 0.0638541728 * b;
    let k_s = -0.0894841775 * a - 1.291485548 * b;

    {
        let l_ = 1 + S * k_l;
        let m_ = 1 + S * k_m;
        let s_ = 1 + S * k_s;

        let l = l_ * l_ * l_;
        let m = m_ * m_ * m_;
        let s = s_ * s_ * s_;

        let l_dS = 3 * k_l * l_ * l_;
        let m_dS = 3 * k_m * m_ * m_;
        let s_dS = 3 * k_s * s_ * s_;

        let l_dS2 = 6 * k_l * k_l * l_;
        let m_dS2 = 6 * k_m * k_m * m_;
        let s_dS2 = 6 * k_s * k_s * s_;

        let f = wl * l + wm * m + ws * s;
        let f1 = wl * l_dS + wm * m_dS + ws * s_dS;
        let f2 = wl * l_dS2 + wm * m_dS2 + ws * s_dS2;

        S = S - (f * f1) / (f1 * f1 - 0.5 * f * f2);
    }

    return S;
}

function find_cusp(a, b) {
    // First, find the maximum saturation (saturation S = C/L)
    let S_cusp = compute_max_saturation(a, b);

    // Convert to linear sRGB to find the first point where at least one of r,g or b >= 1:
    let rgb_at_max = oklab_to_linear_srgb(1, S_cusp * a, S_cusp * b);
    let L_cusp = Math.cbrt(1 / Math.max(Math.max(rgb_at_max[0], rgb_at_max[1]), rgb_at_max[2]));
    let C_cusp = L_cusp * S_cusp;

    return [L_cusp, C_cusp];
}

// Finds intersection of the line defined by
// L = L0 * (1 - t) + t * L1;
// C = t * C1;
// a and b must be normalized so a^2 + b^2 == 1
function find_gamut_intersection(a, b, L1, C1, L0, cusp = null) {
    if (!cusp) {
        // Find the cusp of the gamut triangle
        cusp = find_cusp(a, b);
    }

    // Find the intersection for upper and lower half seprately
    let t;
    if ((L1 - L0) * cusp[1] - (cusp[0] - L0) * C1 <= 0) {
        // Lower half

        t = (cusp[1] * L0) / (C1 * cusp[0] + cusp[1] * (L0 - L1));
    } else {
        // Upper half

        // First intersect with triangle
        t = (cusp[1] * (L0 - 1)) / (C1 * (cusp[0] - 1) + cusp[1] * (L0 - L1));

        // Then one step Halley's method
        {
            let dL = L1 - L0;
            let dC = C1;

            let k_l = +0.3963377774 * a + 0.2158037573 * b;
            let k_m = -0.1055613458 * a - 0.0638541728 * b;
            let k_s = -0.0894841775 * a - 1.291485548 * b;

            let l_dt = dL + dC * k_l;
            let m_dt = dL + dC * k_m;
            let s_dt = dL + dC * k_s;

            // If higher accuracy is required, 2 or 3 iterations of the following block can be used:
            {
                let L = L0 * (1 - t) + t * L1;
                let C = t * C1;

                let l_ = L + C * k_l;
                let m_ = L + C * k_m;
                let s_ = L + C * k_s;

                let l = l_ * l_ * l_;
                let m = m_ * m_ * m_;
                let s = s_ * s_ * s_;

                let ldt = 3 * l_dt * l_ * l_;
                let mdt = 3 * m_dt * m_ * m_;
                let sdt = 3 * s_dt * s_ * s_;

                let ldt2 = 6 * l_dt * l_dt * l_;
                let mdt2 = 6 * m_dt * m_dt * m_;
                let sdt2 = 6 * s_dt * s_dt * s_;

                let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s - 1;
                let r1 = 4.0767416621 * ldt - 3.3077115913 * mdt + 0.2309699292 * sdt;
                let r2 = 4.0767416621 * ldt2 - 3.3077115913 * mdt2 + 0.2309699292 * sdt2;

                let u_r = r1 / (r1 * r1 - 0.5 * r * r2);
                let t_r = -r * u_r;

                let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s - 1;
                let g1 = -1.2684380046 * ldt + 2.6097574011 * mdt - 0.3413193965 * sdt;
                let g2 = -1.2684380046 * ldt2 + 2.6097574011 * mdt2 - 0.3413193965 * sdt2;

                let u_g = g1 / (g1 * g1 - 0.5 * g * g2);
                let t_g = -g * u_g;

                let b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s - 1;
                let b1 = -0.0041960863 * ldt - 0.7034186147 * mdt + 1.707614701 * sdt;
                let b2 = -0.0041960863 * ldt2 - 0.7034186147 * mdt2 + 1.707614701 * sdt2;

                let u_b = b1 / (b1 * b1 - 0.5 * b * b2);
                let t_b = -b * u_b;

                t_r = u_r >= 0 ? t_r : 10e5;
                t_g = u_g >= 0 ? t_g : 10e5;
                t_b = u_b >= 0 ? t_b : 10e5;

                t += Math.min(t_r, Math.min(t_g, t_b));
            }
        }
    }

    return t;
}

function get_ST_max(a_, b_, cusp = null) {
    if (!cusp) {
        cusp = find_cusp(a_, b_);
    }

    let L = cusp[0];
    let C = cusp[1];
    return [C / L, C / (1 - L)];
}

function get_ST_mid(a_, b_) {
    S =
        0.11516993 +
        1 /
            (+7.4477897 +
                4.1590124 * b_ +
                a_ *
                    (-2.19557347 +
                        1.75198401 * b_ +
                        a_ *
                            (-2.13704948 -
                                10.02301043 * b_ +
                                a_ * (-4.24894561 + 5.38770819 * b_ + 4.69891013 * a_))));

    T =
        0.11239642 +
        1 /
            (+1.6132032 -
                0.68124379 * b_ +
                a_ *
                    (+0.40370612 +
                        0.90148123 * b_ +
                        a_ *
                            (-0.27087943 +
                                0.6122399 * b_ +
                                a_ * (+0.00299215 - 0.45399568 * b_ - 0.14661872 * a_))));

    return [S, T];
}

function get_Cs(L, a_, b_) {
    cusp = find_cusp(a_, b_);

    let C_max = find_gamut_intersection(a_, b_, L, 1, L, cusp);
    let ST_max = get_ST_max(a_, b_, cusp);

    let S_mid =
        0.11516993 +
        1 /
            (+7.4477897 +
                4.1590124 * b_ +
                a_ *
                    (-2.19557347 +
                        1.75198401 * b_ +
                        a_ *
                            (-2.13704948 -
                                10.02301043 * b_ +
                                a_ * (-4.24894561 + 5.38770819 * b_ + 4.69891013 * a_))));

    let T_mid =
        0.11239642 +
        1 /
            (+1.6132032 -
                0.68124379 * b_ +
                a_ *
                    (+0.40370612 +
                        0.90148123 * b_ +
                        a_ *
                            (-0.27087943 +
                                0.6122399 * b_ +
                                a_ * (+0.00299215 - 0.45399568 * b_ - 0.14661872 * a_))));

    let k = C_max / Math.min(L * ST_max[0], (1 - L) * ST_max[1]);

    let C_mid;
    {
        let C_a = L * S_mid;
        let C_b = (1 - L) * T_mid;

        C_mid =
            0.9 *
            k *
            Math.sqrt(Math.sqrt(1 / (1 / (C_a * C_a * C_a * C_a) + 1 / (C_b * C_b * C_b * C_b))));
    }

    let C_0;
    {
        let C_a = L * 0.4;
        let C_b = (1 - L) * 0.8;

        C_0 = Math.sqrt(1 / (1 / (C_a * C_a) + 1 / (C_b * C_b)));
    }

    return [C_0, C_mid, C_max];
}

function okhsl_to_srgb(h, s, l) {
    if (l == 1) {
        return [1, 1, 1];
    } else if (l == 0) {
        return [0, 0, 0];
    }

    let a_ = Math.cos(2 * Math.PI * h);
    let b_ = Math.sin(2 * Math.PI * h);
    let L = toe_inv(l);

    let Cs = get_Cs(L, a_, b_);
    let C_0 = Cs[0];
    let C_mid = Cs[1];
    let C_max = Cs[2];

    let C, t, k_0, k_1, k_2;
    if (s < 0.8) {
        t = 1.25 * s;
        k_0 = 0;
        k_1 = 0.8 * C_0;
        k_2 = 1 - k_1 / C_mid;
    } else {
        t = 5 * (s - 0.8);
        k_0 = C_mid;
        k_1 = (0.2 * C_mid * C_mid * 1.25 * 1.25) / C_0;
        k_2 = 1 - k_1 / (C_max - C_mid);
    }

    C = k_0 + (t * k_1) / (1 - k_2 * t);

    // If we would only use one of the Cs:
    //C = s*C_0;
    //C = s*1.25*C_mid;
    //C = s*C_max;

    let rgb = oklab_to_linear_srgb(L, C * a_, C * b_);
    return [
        srgb_transfer_function(rgb[0]),
        srgb_transfer_function(rgb[1]),
        srgb_transfer_function(rgb[2]),
    ];
}

function srgb_to_okhsl(r, g, b) {
    if (r == 1 && g == 1 && b == 1) {
        return [0, 0, 1];
    } else if (r == 0 && g == 0 && b == 0) {
        return [0, 0, 0];
    }
    let lab = linear_srgb_to_oklab(
        srgb_transfer_function_inv(r),
        srgb_transfer_function_inv(g),
        srgb_transfer_function_inv(b)
    );

    let C = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
    let a_ = lab[1] / C;
    let b_ = lab[2] / C;

    let L = lab[0];
    let h = 0.5 + (0.5 * Math.atan2(-lab[2], -lab[1])) / Math.PI;

    let Cs = get_Cs(L, a_, b_);
    let C_0 = Cs[0];
    let C_mid = Cs[1];
    let C_max = Cs[2];

    let s;
    if (C < C_mid) {
        let k_0 = 0;
        let k_1 = 0.8 * C_0;
        let k_2 = 1 - k_1 / C_mid;

        let t = (C - k_0) / (k_1 + k_2 * (C - k_0));
        s = t * 0.8;
    } else {
        let k_0 = C_mid;
        let k_1 = (0.2 * C_mid * C_mid * 1.25 * 1.25) / C_0;
        let k_2 = 1 - k_1 / (C_max - C_mid);

        let t = (C - k_0) / (k_1 + k_2 * (C - k_0));
        s = 0.8 + 0.2 * t;
    }

    let l = toe(L);
    return [h, s, l];
}

function okhsv_to_srgb(h, s, v) {
    let a_ = Math.cos(2 * Math.PI * h);
    let b_ = Math.sin(2 * Math.PI * h);

    let ST_max = get_ST_max(a_, b_);
    let S_max = ST_max[0];
    let S_0 = 0.5;
    let T = ST_max[1];
    let k = 1 - S_0 / S_max;

    let L_v = 1 - (s * S_0) / (S_0 + T - T * k * s);
    let C_v = (s * T * S_0) / (S_0 + T - T * k * s);

    let L = v * L_v;
    let C = v * C_v;

    // to present steps along the way
    //L = v;
    //C = v*s*S_max;
    //L = v*(1 - s*S_max/(S_max+T));
    //C = v*s*S_max*T/(S_max+T);

    let L_vt = toe_inv(L_v);
    let C_vt = (C_v * L_vt) / L_v;

    let L_new = toe_inv(L); // * L_v/L_vt;
    C = (C * L_new) / L;
    L = L_new;

    let rgb_scale = oklab_to_linear_srgb(L_vt, a_ * C_vt, b_ * C_vt);
    let scale_L = Math.cbrt(1 / Math.max(rgb_scale[0], rgb_scale[1], rgb_scale[2], 0));

    // remove to see effect without rescaling
    L = L * scale_L;
    C = C * scale_L;

    let rgb = oklab_to_linear_srgb(L, C * a_, C * b_);
    return [
        srgb_transfer_function(rgb[0]),
        srgb_transfer_function(rgb[1]),
        srgb_transfer_function(rgb[2]),
    ];
}

function srgb_to_okhsv(r, g, b) {
    if (r == 1 && g == 1 && b == 1) {
        return [0, 0, 1];
    } else if (r == 0 && g == 0 && b == 0) {
        return [0, 0, 0];
    }
    let lab = linear_srgb_to_oklab(
        srgb_transfer_function_inv(r),
        srgb_transfer_function_inv(g),
        srgb_transfer_function_inv(b)
    );

    let C = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
    let a_ = lab[1] / C;
    let b_ = lab[2] / C;

    let L = lab[0];
    let h = 0.5 + (0.5 * Math.atan2(-lab[2], -lab[1])) / Math.PI;

    let ST_max = get_ST_max(a_, b_);
    let S_max = ST_max[0];
    let S_0 = 0.5;
    let T = ST_max[1];
    let k = 1 - S_0 / S_max;

    t = T / (C + L * T);
    let L_v = t * L;
    let C_v = t * C;

    L_vt = toe_inv(L_v);
    C_vt = (C_v * L_vt) / L_v;

    rgb_scale = oklab_to_linear_srgb(L_vt, a_ * C_vt, b_ * C_vt);
    scale_L = Math.cbrt(1 / Math.max(rgb_scale[0], rgb_scale[1], rgb_scale[2], 0));

    L = L / scale_L;
    C = C / scale_L;

    C = (C * toe(L)) / L;
    L = toe(L);

    v = L / L_v;
    s = ((S_0 + T) * C_v) / (T * S_0 + T * k * C_v);

    return [h, s, v];
}

function hex_to_rgb(hex) {
    if (hex.substr(0, 1) == '#') hex = hex.substr(1);

    if (hex.match(/^([0-9a-f]{3})$/i)) {
        let r = parseInt(hex.charAt(0), 16) / 15;
        let g = parseInt(hex.charAt(1), 16) / 15;
        let b = parseInt(hex.charAt(2), 16) / 15;
        return [r, g, b];
    }
    if (hex.match(/^([0-9a-f]{6})$/i)) {
        let r = parseInt(hex.substr(0, 2), 16);
        let g = parseInt(hex.substr(2, 2), 16);
        let b = parseInt(hex.substr(4, 2), 16);
        return [r, g, b];
    }
    if (hex.match(/^([0-9a-f]{1})$/i)) {
        let a = parseInt(hex.substr(0), 16) / 15;
        return [a, a, a];
    }
    if (hex.match(/^([0-9a-f]{2})$/i)) {
        let a = parseInt(hex.substr(0, 2), 16);
        return [a, a, a];
    }

    return null;
}

function rgb_to_hex(r, g, b) {
    function componentToHex(x) {
        var hex = Math.round(x).toString(16);
        return hex.length == 1 ? '0' + hex : hex;
    }

    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

module.exports = {
    okhsl_to_srgb,
    srgb_to_okhsl,
    okhsv_to_srgb,
    srgb_to_okhsv,
};
