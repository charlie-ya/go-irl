import { generateReferralCode } from './referralService';

// --- Types ---

export interface ShareCardOptions {
    explorerName: string;
    rank: string;
    colour: string;
    playerId: string;
    capturedSquareCount: number;
}

export interface NestShareCardOptions {
    explorerName: string;
    rank: string;
    colour: string;
    playerId: string;
    nestTitle: string;
}

// --- Canvas Capture ---

/**
 * Captures the current Mapbox map canvas and composites a branded overlay
 * with the player's name, rank, and "Roamin' Empire" branding.
 * Returns a PNG Blob ready for sharing.
 */
export async function captureShareCard(
    map: mapboxgl.Map,
    options: ShareCardOptions
): Promise<Blob> {
    const mapCanvas = map.getCanvas();
    const width = mapCanvas.width;
    const height = mapCanvas.height;

    // Create compositing canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Draw map screenshot as base
    ctx.drawImage(mapCanvas, 0, 0);

    // 2. Draw gradient overlay at bottom for text legibility
    const gradientHeight = height * 0.25;
    const gradient = ctx.createLinearGradient(0, height - gradientHeight, 0, height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - gradientHeight, width, gradientHeight);

    // 3. Draw player colour accent bar at bottom
    ctx.fillStyle = options.colour;
    ctx.fillRect(0, height - 6, width, 6);

    // Scale font sizes relative to canvas width (for device-pixel-ratio independence)
    const baseFontSize = Math.max(14, width / 25);
    const smallFontSize = Math.max(10, baseFontSize * 0.65);
    const brandFontSize = Math.max(12, baseFontSize * 0.75);

    // 4. Draw player name + rank (bottom-left)
    const bottomPadding = 20;
    const leftPadding = 20;

    // Explorer name
    ctx.font = `bold ${baseFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.explorerName, leftPadding, height - bottomPadding - smallFontSize - 4);

    // Rank
    ctx.font = `${smallFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = options.colour;
    ctx.fillText(options.rank, leftPadding, height - bottomPadding);

    // 5. Draw "Roamin' Empire" branding (bottom-right)
    ctx.font = `bold ${brandFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText("Roamin' Empire", width - 20, height - bottomPadding);
    ctx.textAlign = 'left'; // Reset

    // 6. Draw capture count badge (top-left)
    const badgeText = `${options.capturedSquareCount} square${options.capturedSquareCount === 1 ? '' : 's'} captured`;
    ctx.font = `bold ${smallFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const badgeWidth = ctx.measureText(badgeText).width + 24;
    const badgeHeight = smallFontSize + 14;
    const badgeX = 16;
    const badgeY = 16;

    // Badge background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 8);
    ctx.fill();

    // Badge text
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + 12, badgeY + badgeHeight / 2);

    // Convert to Blob
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('Failed to create image')),
            'image/png',
            1.0
        );
    });
}

/**
 * Captures the current Mapbox map canvas and composites a branded overlay
 * with the player's name, rank, and "Roamin' Empire" branding, specifically for nests.
 * Returns a PNG Blob ready for sharing.
 */
export async function captureNestShareCard(
    map: mapboxgl.Map,
    options: NestShareCardOptions
): Promise<Blob> {
    const mapCanvas = map.getCanvas();
    const width = mapCanvas.width;
    const height = mapCanvas.height;

    // Create compositing canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Draw map screenshot as base
    ctx.drawImage(mapCanvas, 0, 0);

    // 2. Draw gradient overlay at bottom for text legibility
    const gradientHeight = height * 0.25;
    const gradient = ctx.createLinearGradient(0, height - gradientHeight, 0, height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - gradientHeight, width, gradientHeight);

    // 3. Draw player colour accent bar at bottom
    ctx.fillStyle = options.colour;
    ctx.fillRect(0, height - 6, width, 6);

    // Scale font sizes relative to canvas width
    const baseFontSize = Math.max(14, width / 25);
    const smallFontSize = Math.max(10, baseFontSize * 0.65);
    const brandFontSize = Math.max(12, baseFontSize * 0.75);

    // 4. Draw player name + rank (bottom-left)
    const bottomPadding = 20;
    const leftPadding = 20;

    // Explorer name
    ctx.font = `bold ${baseFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'bottom';
    ctx.fillText(options.explorerName, leftPadding, height - bottomPadding - smallFontSize - 4);

    // Rank
    ctx.font = `${smallFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = options.colour;
    ctx.fillText(options.rank, leftPadding, height - bottomPadding);

    // 5. Draw "Roamin' Empire" branding (bottom-right)
    ctx.font = `bold ${brandFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText("Roamin' Empire", width - 20, height - bottomPadding);
    ctx.textAlign = 'left'; // Reset

    // 6. Draw Nest badge (top-left)
    const badgeText = `🪹 ${options.nestTitle}`;
    ctx.font = `bold ${smallFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const badgeWidth = ctx.measureText(badgeText).width + 24;
    const badgeHeight = smallFontSize + 14;
    const badgeX = 16;
    const badgeY = 16;

    // Badge background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 8);
    ctx.fill();

    // Badge text
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + 12, badgeY + badgeHeight / 2);

    // Convert to Blob
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('Failed to create image')),
            'image/png',
            1.0
        );
    });
}

// --- Share ---

// Share links always use the web URL so recipients get a universal link that works
// regardless of their platform (iOS, Android, desktop).
// The web landing page detects the recipient's platform and shows the right store button.
const SHARE_URL = 'https://go-irl-443f4.web.app';

/**
 * Shares the capture card image via native share sheet or fallback.
 * Uses Capacitor Share plugin on native, Web Share API on web.
 */
export async function shareCard(
    blob: Blob,
    playerId: string,
    capturedSquareCount: number
): Promise<void> {
    const referralCode = generateReferralCode(playerId);
    const referralUrl = `${SHARE_URL}/?ref=${referralCode}`;
    const shareText = `I just captured ${capturedSquareCount} square${capturedSquareCount === 1 ? '' : 's'} in Roamin' Empire! 🏛️ Come explore with me: ${referralUrl}`;

    // Convert blob to base64 data URI for Capacitor Share
    const toBase64 = (): Promise<string> => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });

    // Try Capacitor native share (Android/iOS)
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
            const { Share } = await import('@capacitor/share');
            const { Filesystem, Directory } = await import('@capacitor/filesystem');

            // Save image to cache directory
            const base64Data = await toBase64();
            const fileName = `roamin-empire-capture-${Date.now()}.png`;
            const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
            });

            await Share.share({
                title: "Roamin' Empire",
                text: shareText,
                url: savedFile.uri,
                dialogTitle: 'Share your capture!',
            });
            return;
        }
    } catch (e: any) {
        if (e.name === 'AbortError' || e.message?.includes('canceled')) return;
        console.warn('[ShareCard] Capacitor share failed, trying web fallback:', e);
    }

    // Web fallback: try Web Share API with file
    const file = new File([blob], 'roamin-empire-capture.png', { type: 'image/png' });
    const shareData: ShareData = { text: shareText, files: [file] };

    try {
        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
        }
    } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.warn('[ShareCard] Web share with file failed:', e);
    }

    // Web fallback: share text only
    try {
        if (navigator.share) {
            await navigator.share({ text: shareText });
            return;
        }
    } catch (e: any) {
        if (e.name === 'AbortError') return;
    }

    // Final fallback: clipboard + download
    try {
        await navigator.clipboard.writeText(shareText);
    } catch { /* silent */ }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roamin-empire-capture.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Share text copied & image saved! 📋');
}

/**
 * Shares the nest card image via native share sheet or fallback.
 */
export async function shareNestCard(
    blob: Blob,
    playerId: string,
    nestTitle: string
): Promise<void> {
    const referralCode = generateReferralCode(playerId);
    const referralUrl = `${SHARE_URL}/?ref=${referralCode}`;
    const shareText = `I just established my home base, ${nestTitle}, in Roamin' Empire! 🪹 Come sign my guestbook: ${referralUrl}`;

    // Convert blob to base64 data URI for Capacitor Share
    const toBase64 = (): Promise<string> => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });

    // Try Capacitor native share (Android/iOS)
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
            const { Share } = await import('@capacitor/share');
            const { Filesystem, Directory } = await import('@capacitor/filesystem');

            // Save image to cache directory
            const base64Data = await toBase64();
            const fileName = `roamin-empire-nest-${Date.now()}.png`;
            const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache,
            });

            await Share.share({
                title: "Roamin' Empire",
                text: shareText,
                url: savedFile.uri,
                dialogTitle: 'Share your nest!',
            });
            return;
        }
    } catch (e: any) {
        if (e.name === 'AbortError' || e.message?.includes('canceled')) return;
        console.warn('[ShareCard] Capacitor share failed, trying web fallback:', e);
    }

    // Web fallback: try Web Share API with file
    const file = new File([blob], 'roamin-empire-nest.png', { type: 'image/png' });
    const shareData: ShareData = { text: shareText, files: [file] };

    try {
        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
        }
    } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.warn('[ShareCard] Web share with file failed:', e);
    }

    // Web fallback: share text only
    try {
        if (navigator.share) {
            await navigator.share({ text: shareText });
            return;
        }
    } catch (e: any) {
        if (e.name === 'AbortError') return;
    }

    // Final fallback: clipboard + download
    try {
        await navigator.clipboard.writeText(shareText);
    } catch { /* silent */ }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roamin-empire-nest.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Share text copied & image saved! 📋');
}

// --- Helpers ---

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
