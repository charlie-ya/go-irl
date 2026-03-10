/**
 * Nolli Map Pattern Generator
 * 
 * Generates canvas-based fill patterns for Mapbox GL:
 * - Building hatch: horizontal close lines (dark grey on white)
 * - Vegetation: stylized tree/grass symbols
 */

/**
 * Create a horizontal line hatch pattern for buildings.
 * Emulates the cross-hatch/figure-ground fill from original Nolli maps.
 * 
 * @returns ImageData-compatible object for map.addImage()
 */
export function createBuildingHatchPattern(): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
} {
    // Fixed 4px tile: 1px black line, 1px white gap, repeated twice.
    // Ignoring devicePixelRatio — Mapbox handles pattern tiling at the
    // GL level, so DPR scaling was making the stripes oversized on
    // high-density mobile screens.
    const size = 4;

    const data = new Uint8ClampedArray(size * size * 4);

    // Pure black and white for maximum contrast (original Nolli style)
    const bg = [0xFF, 0xFF, 0xFF, 255]; // white
    const line = [0x00, 0x00, 0x00, 255]; // black

    for (let y = 0; y < size; y++) {
        // Alternating rows: line, gap, line, gap
        const isLine = y % 2 === 0;
        const color = isLine ? line : bg;

        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            data[idx] = color[0];
            data[idx + 1] = color[1];
            data[idx + 2] = color[2];
            data[idx + 3] = color[3];
        }
    }

    return { width: size, height: size, data };
}

/**
 * Create a pattern suggesting parkland / gardens.
 * Small stylized tree-top circles arranged in a loose grid,
 * reminiscent of Nolli-era cartographic conventions.
 */
export function createParkPattern(): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
} {
    const size = 24;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Light green-grey background (muted, period-appropriate)
    ctx.fillStyle = '#dde6d5';
    ctx.fillRect(0, 0, size, size);

    // Stylized tree tops — small circles in a staggered grid
    ctx.fillStyle = '#a3b899';
    ctx.strokeStyle = '#7a8c6e';
    ctx.lineWidth = 0.5;

    // Row 1
    drawTreeSymbol(ctx, 6, 6, 3);
    drawTreeSymbol(ctx, 18, 6, 2.5);

    // Row 2 (offset)
    drawTreeSymbol(ctx, 12, 16, 3);
    drawTreeSymbol(ctx, 0, 18, 2);
    drawTreeSymbol(ctx, 24, 18, 2);

    return ctx.getImageData(0, 0, size, size);
}

/**
 * Create a pattern suggesting forest / woodland.
 * Denser trees than park, darker tones.
 */
export function createForestPattern(): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
} {
    const size = 20;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Darker green-grey
    ctx.fillStyle = '#c8d4be';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#8a9e78';
    ctx.strokeStyle = '#6b7d5c';
    ctx.lineWidth = 0.5;

    // Dense tree grid
    drawTreeSymbol(ctx, 5, 5, 3);
    drawTreeSymbol(ctx, 15, 5, 2.5);
    drawTreeSymbol(ctx, 10, 12, 3.5);
    drawTreeSymbol(ctx, 2, 16, 2);
    drawTreeSymbol(ctx, 18, 16, 2);

    return ctx.getImageData(0, 0, size, size);
}

/**
 * Create a pattern for agricultural land.
 * Parallel horizontal lines suggesting plowed rows,
 * with occasional grass tufts.
 */
export function createAgriculturePattern(): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
} {
    const size = 16;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Warm tan background
    ctx.fillStyle = '#e5dfc9';
    ctx.fillRect(0, 0, size, size);

    // Furrow lines (horizontal, fine)
    ctx.strokeStyle = '#c4bc9f';
    ctx.lineWidth = 0.5;

    for (let y = 4; y < size; y += 5) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(size, y + 0.5);
        ctx.stroke();
    }

    // Small grass tufts
    ctx.strokeStyle = '#9aab82';
    ctx.lineWidth = 0.8;

    // Tuft at (4, 2)
    drawGrassTuft(ctx, 4, 2);
    // Tuft at (12, 10)
    drawGrassTuft(ctx, 12, 10);

    return ctx.getImageData(0, 0, size, size);
}

/**
 * Draw a stylized tree-top circle (Nolli convention)
 */
function drawTreeSymbol(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}

/**
 * Draw a small grass tuft (3 short diagonal lines from a base point)
 */
function drawGrassTuft(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const h = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x - 1, y);
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y - 0.5);
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + 1, y);
    ctx.stroke();
}

/**
 * Register all Nolli patterns on a Mapbox map instance.
 * Call this in the map's `onLoad` handler.
 */
export function registerNolliPatterns(map: mapboxgl.Map) {
    if (!map.hasImage('nolli-building-hatch')) {
        const hatch = createBuildingHatchPattern();
        map.addImage('nolli-building-hatch', hatch, { sdf: false });
    }

    if (!map.hasImage('nolli-park')) {
        const park = createParkPattern();
        map.addImage('nolli-park', park, { sdf: false });
    }

    if (!map.hasImage('nolli-forest')) {
        const forest = createForestPattern();
        map.addImage('nolli-forest', forest, { sdf: false });
    }

    if (!map.hasImage('nolli-agriculture')) {
        const agri = createAgriculturePattern();
        map.addImage('nolli-agriculture', agri, { sdf: false });
    }
}
