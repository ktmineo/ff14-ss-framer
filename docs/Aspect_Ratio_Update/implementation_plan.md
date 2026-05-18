# Implementation Plan - Add Aspect Ratios

## Goal Description
Add "16:9" (Landscape) and "Square" (1:1) aspect ratios to the image framer tool to provide more options for users.

## Proposed Changes

### UI Update (`index.html`)
- Split "1. Orientation" into two sub-controls:
  - **Aspect Ratio**: [Standard (4:3)] [Wide (16:9)] [Square (1:1)]
  - **Orientation**: [Vertical] [Horizontal]
- "Orientation" buttons will be disabled or hidden when "Square" is selected.

### Logic Update (`js/app.js`)
- Introduce state variables:
  - `currentAspect`: 'standard', 'wide', 'square'
  - `currentOrientation`: 'vertical', 'horizontal'
- `updateDimensions()` function:
  - **Standard**:
    - Vertical: 685 x 914
    - Horizontal: 914 x 685
  - **Wide**:
    - Vertical: 514 x 914 (9:16)
    - Horizontal: 914 x 514 (16:9)
  - **Square**:
    - 800 x 800 (Orientation ignored)
- Update button click handlers to update these states and call `updateDimensions`.
- **Font Size Update**:
  - Decrease `FONT_U` value (currently 24) to something smaller (e.g., 20 or 18) to reduce Info Text size.

## Verification Plan
### Manual Verification
- Click each button (Vertical, Horizontal, 16:9, Square) and verify the canvas resizes correctly.
- Verify the frame (white bg) and overlay text position updates correctly.
- Verify "Export Image" works with the new dimensions.
