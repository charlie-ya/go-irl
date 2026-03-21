/**
 * Captures a map screenshot at a fixed zoom level centered on a tile.
 * Used when creating offers so the seller sees a consistent map preview
 * without triggering additional Mapbox map loads.
 */
export async function captureOfferScreenshot(
    map: mapboxgl.Map,
    tileLat: number,
    tileLng: number
): Promise<string> {
    // Save current view
    const prevCenter = map.getCenter();
    const prevZoom = map.getZoom();
    const prevBearing = map.getBearing();
    const prevPitch = map.getPitch();

    // Snap to fixed view centered on tile
    map.jumpTo({
        center: [tileLng, tileLat],
        zoom: 16.5,
        bearing: 0,
        pitch: 0,
    });

    // Wait for map to finish rendering the new view
    await new Promise<void>((resolve) => {
        if (map.isStyleLoaded() && !map.isMoving()) {
            // Give the map one render cycle to update tiles
            map.once('idle', () => resolve());
            map.triggerRepaint();
        } else {
            map.once('idle', () => resolve());
        }
    });

    // Capture the canvas as a compressed JPEG
    const dataUrl = map.getCanvas().toDataURL('image/jpeg', 0.6);

    // Restore the buyer's original view
    map.jumpTo({
        center: prevCenter,
        zoom: prevZoom,
        bearing: prevBearing,
        pitch: prevPitch,
    });

    return dataUrl;
}
