
// This file handles generating procedural LUT data.
// A standard 64^3 LUT laid out on a 512x512 texture (8x8 grid).

export const LutPresets = {
    'identity': { name: 'Standard', src: null },
    // Re-implemented CSS filters as LUTs
    'analog': { name: 'Film', src: null },
    'bloom': { name: 'Bloom', src: null },
    'vibrant': { name: 'Vibrant', src: null },
    'noir': { name: 'Noir', src: null },
    'mist': { name: 'Mist', src: null }
};

// --- Math Helpers ---

const clamp = (x) => Math.max(0, Math.min(1, x));
const mix = (x, y, a) => x * (1 - a) + y * a;

// S-Curve for cinematic contrast
// val: input 0..1
// amount: intensity (usually around 0.2 - 0.5 for subtle effect)
function applySCurve(val, amount) {
    // Simple sigmoid-like easing
    // Using a polynomial approximation for performant S-curve
    // f(x) = x for amount=0
    // Stronger S-shape for higher amount
    // Let's use cosine based for smooth S: 0.5 - cos(x*PI)*0.5 mixed with linear
    const curve = 0.5 - Math.cos(val * Math.PI) * 0.5;
    return mix(val, curve, amount);
}

// Fade / Lift blacks
// val: input 0..1
// lift: how much to lift blacks (0.0 - 1.0)
function applyFade(val, lift) {
    return val * (1 - lift) + lift;
}


// --- CSS Filter Logic Implementation ---

// 1. Contrast (1.0 = normal)
// CSS contrast is: (val - 0.5) * amt + 0.5
function applyContrast(r, g, b, amt) {
    if (amt === 1) return [r, g, b];
    r = (r - 0.5) * amt + 0.5;
    g = (g - 0.5) * amt + 0.5;
    b = (b - 0.5) * amt + 0.5;
    return [r, g, b]; // Clamping done at end
}

// 2. Brightness (1.0 = normal)
// CSS brightness is simple mul
function applyBrightness(r, g, b, amt) {
    if (amt === 1) return [r, g, b];
    return [r * amt, g * amt, b * amt];
}

// 3. Saturate (1.0 = normal)
function applySaturate(r, g, b, amt) {
    if (amt === 1) return [r, g, b];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // Rec 709 or standard
    r = mix(luma, r, amt);
    g = mix(luma, g, amt);
    b = mix(luma, b, amt);
    return [r, g, b];
}

// 4. Sepia (0.0 = none, 1.0 = full)
function applySepia(r, g, b, amt) {
    if (amt === 0) return [r, g, b];
    const nr = (r * 0.393) + (g * 0.769) + (b * 0.189);
    const ng = (r * 0.349) + (g * 0.686) + (b * 0.168);
    const nb = (r * 0.272) + (g * 0.534) + (b * 0.131);

    r = mix(r, nr, amt);
    g = mix(g, ng, amt);
    b = mix(b, nb, amt);
    return [r, g, b];
}

// 5. Hue Rotate (degrees)
// Standard RGB to HSL -> Rotate -> RGB is complex.
// Approx matrix rotation around grey axis.
// [0.213, 0.715, 0.072] axis.
function applyHueRotate(r, g, b, deg) {
    if (deg === 0) return [r, g, b];

    const rad = deg * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // Matrix weights (Standard simplified hue rotation approx)
    const lumR = 0.213;
    const lumG = 0.715;
    const lumB = 0.072;

    const nr = (lumR + cos * (1 - lumR) + sin * (-lumR)) * r +
        (lumG + cos * (-lumG) + sin * (-lumG)) * g +
        (lumB + cos * (-lumB) + sin * (1 - lumB)) * b;

    const ng = (lumR + cos * (-lumR) + sin * 0.143) * r +
        (lumG + cos * (1 - lumG) + sin * 0.140) * g +
        (lumB + cos * (-lumB) + sin * (-0.283)) * b;

    const nb = (lumR + cos * (-lumR) + sin * (-(1 - lumR))) * r +
        (lumG + cos * (-lumG) + sin * (lumG)) * g +
        (lumB + cos * (1 - lumB) + sin * (lumB)) * b;

    return [nr, ng, nb];
}

// Composite function for standard CSS pipeline
function cssFilterTransform(r, g, b, { con, bri, sat, sep, hue }) {
    // Standard order: Hue -> Brightness -> Saturate? 
    // Wait, ctx.filter order matters.
    // Standard syntax: filter: contrast() brightness() saturate()...
    // The order in the string applies left to right.
    // In app.js: `contrast(${con}) brightness(${bri}) saturate(${sat}) sepia(${sep}) hue-rotate(${hue}deg)`

    [r, g, b] = applyContrast(r, g, b, con);
    [r, g, b] = applyBrightness(r, g, b, bri);
    [r, g, b] = applySaturate(r, g, b, sat);
    [r, g, b] = applySepia(r, g, b, sep);
    [r, g, b] = applyHueRotate(r, g, b, hue);

    return [clamp(r), clamp(g), clamp(b)];
}

// --- Presets Configurations ---
// analog: con: 1.1, bri: 1.15, sat: 0.9, sep: 0.3, hue: -10
const analogConfig = { con: 1.1, bri: 1.15, sat: 0.9, sep: 0.3, hue: -10 };

// bloom: con: 0.8, bri: 1.3, sat: 1.1, sep: 0.0, hue: 0
const bloomConfig = { con: 0.8, bri: 1.3, sat: 1.1, sep: 0.0, hue: 0 };

// vibrant: con: 1.15, bri: 1.1, sat: 1.2, sep: 0.1, hue: 0
const vibrantConfig = { con: 1.15, bri: 1.1, sat: 1.2, sep: 0.1, hue: 0 };

// noir: con: 1.5, bri: 1.0, sat: 0.0, sep: 0.0, hue: 0
const noirConfig = { con: 1.5, bri: 1.0, sat: 0.0, sep: 0.0, hue: 0 };


// --- Mist Filter Logic ---
// Aim: "Cinematic", "Matte Blacks", "Cool/Desaturated"
function mistTransform(r, g, b) {
    // 1. Lift blacks (Fade)
    const fadeAmount = 0.15; // Grayish blacks
    r = applyFade(r, fadeAmount);
    g = applyFade(g, fadeAmount);
    b = applyFade(b, fadeAmount);

    // 2. S-Curve for Contrast
    const curveStrength = 0.4;
    r = applySCurve(r, curveStrength);
    g = applySCurve(g, curveStrength);
    b = applySCurve(b, curveStrength);

    // 3. Desaturate slightly (Cool tone often implies less saturation)
    const saturation = 0.85;
    [r, g, b] = applySaturate(r, g, b, saturation);

    // 4. Cool tint (Blue/Teal push in shadows/mids?)
    // Let's just push Blue slightly and reduce Red slightly
    r *= 0.95;
    b *= 1.05;

    return [clamp(r), clamp(g), clamp(b)];
}


function identityTransform(r, g, b) {
    return [r, g, b];
}

// --- Generator Core ---

function generateLut(transformFn, config) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const sliceSize = 64;
    const gridCols = 8;

    // Used for performance
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let bIndex = 0; bIndex < 64; bIndex++) {
        const sliceX = (bIndex % gridCols) * sliceSize;
        const sliceY = Math.floor(bIndex / gridCols) * sliceSize;

        // Normalized B coordinate (0..1)
        const bNorm = bIndex / 63;

        for (let gIndex = 0; gIndex < 64; gIndex++) {
            const gNorm = gIndex / 63;

            for (let rIndex = 0; rIndex < 64; rIndex++) {
                const rNorm = rIndex / 63;

                // --- Apply Transform ---
                // We pass normalized values
                let [rOut, gOut, bOut] = transformFn(rNorm, gNorm, bNorm, config);

                // Write back
                const pixelIndex = ((sliceY + gIndex) * size + (sliceX + rIndex)) * 4;

                data[pixelIndex] = Math.floor(rOut * 255);
                data[pixelIndex + 1] = Math.floor(gOut * 255);
                data[pixelIndex + 2] = Math.floor(bOut * 255);
                data[pixelIndex + 3] = 255;
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// --- Exported Accessor ---
export async function getLutImage(key) {
    if (key === 'analog') return generateLut(cssFilterTransform, analogConfig);
    if (key === 'bloom') return generateLut(cssFilterTransform, bloomConfig);
    if (key === 'vibrant') return generateLut(cssFilterTransform, vibrantConfig);
    if (key === 'noir') return generateLut(cssFilterTransform, noirConfig);
    if (key === 'mist') return generateLut(mistTransform, {});

    return generateLut(identityTransform, {});
}
