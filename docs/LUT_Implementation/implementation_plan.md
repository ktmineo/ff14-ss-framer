# Implementation Plan - WebGL LUT Filters

## Goal Description
Implement high-quality "Film Simulation" style filters using WebGL and 3D LUTs (Look-Up Tables) technology, similar to the reference Android application. This will run alongside the existing CSS-based filters.

## User Review Required
> [!IMPORTANT]
> This change introduces WebGL. If the user's device does not support WebGL (very rare nowadays), the new filters will not work.
> The new filters might be slightly more resource-intensive than CSS filters.

## Proposed Changes

### Logic Layer
#### [NEW] [js/gl-renderer.js](file:///c:/Users/ktmin/Desktop/03_ff14pic/js/gl-renderer.js)
- A class `GLRenderer` that manages:
    - WebGL context creation (hidden canvas).
    - Shader program (Vertex + Fragment shader for 3D LUT).
    - Texture management (Source image texture, LUT texture).
    - `render(image, lutData, intensity)` method.

#### [NEW] [js/filters/lut-presets.js](file:///c:/Users/ktmin/Desktop/03_ff14pic/js/filters/lut-presets.js)
- Contains logic to generate or store base64/array data for the Look-Up Tables.
- Initially implementing 2-3 presets (e.g. "Vintage", "Cinematic").

#### [MODIFY] [js/app.js](file:///c:/Users/ktmin/Desktop/03_ff14pic/js/app.js)
- Import `GLRenderer`.
- Initialize `GLRenderer` on startup.
- Modify `draw()` function:
    - Check if `currentFilterKey` corresponds to a CSS filter or a LUT filter.
    - If CSS: Use existing logic.
    - If LUT:
        - Pass `currentImg` to `GLRenderer`.
        - Draw the result from `GLRenderer.canvas` to `mainCanvas`.
        - Apply `ctx.filter` (contrast/brightness) on top if needed, or disable it for pure LUT.
- Update `filterPresets` object to include new LUT types.

## Verification Plan
### Manual Verification
- Load an image.
- Click "Analog" (Old behavior) -> verify CSS filter.
- Click "Film A" (New behavior) -> verify WebGL LUT application.
- Adjust "Strength" slider -> verify effect intensity changes.
- Export Image -> verify downloaded image has the filter applied consistently.
