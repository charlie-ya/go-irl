/**
 * Color validation utilities to ensure user colors are visible
 * against both light and dark backgrounds
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

/**
 * Calculate relative luminance of a color (0-1 scale)
 * Based on WCAG 2.0 formula
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function getRelativeLuminance(hex: string): number {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0.5; // Default to middle luminance if invalid

    // Convert RGB to linear values
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
        const normalized = val / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });

    // Calculate relative luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Check if a color is valid (not too close to white or black)
 * @param hex - Hex color string (e.g., "#FF6B6B")
 * @param minLuminance - Minimum allowed luminance (0-1), default 0.15
 * @param maxLuminance - Maximum allowed luminance (0-1), default 0.85
 * @returns true if color is valid, false if too close to white or black
 */
export function isColorValid(
    hex: string,
    minLuminance: number = 0.15,
    maxLuminance: number = 0.85
): boolean {
    const luminance = getRelativeLuminance(hex);
    return luminance >= minLuminance && luminance <= maxLuminance;
}

/**
 * Get a user-friendly error message for invalid colors
 */
export function getColorValidationMessage(hex: string): string | null {
    const luminance = getRelativeLuminance(hex);

    if (luminance < 0.15) {
        return 'Color is too dark - please choose a brighter color';
    }

    if (luminance > 0.85) {
        return 'Color is too light - please choose a darker color';
    }

    return null;
}
