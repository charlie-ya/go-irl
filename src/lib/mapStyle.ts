import type { Style } from 'mapbox-gl';

// Nolli Map Style Interpretation (Refined)
// - Background (Streets/Public): White
// - Lots (Landuse): Mild Warm Grey (#e8e6dc)
// - Separator: Grey Line
// - Buildings: Lighter Fill + Black Outline (Simulating "Hatch/Figure")

export const NOLLI_MAP_STYLE: Style = {
    version: 8,
    name: "Nolli Map Refined",
    metadata: {},
    sources: {
        "mapbox": {
            type: "vector",
            url: "mapbox://mapbox.mapbox-streets-v8"
        }
    },
    sprite: "mapbox://sprites/mapbox/light-v10",
    glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    layers: [
        // Background - White (represents Streets/Public Space)
        {
            id: "background",
            type: "background",
            paint: {
                "background-color": "#ffffff"
            }
        },

        // Landuse - The "Lots" (#e8e6dc)
        {
            id: "landuse",
            source: "mapbox",
            "source-layer": "landuse",
            type: "fill",
            paint: {
                "fill-color": "#e8e6dc"
            }
        },
        // Landuse Border - The "Grey separator"
        {
            id: "landuse-border",
            source: "mapbox",
            "source-layer": "landuse",
            type: "line",
            paint: {
                "line-color": "#a0a0a0",
                "line-width": 0.5
            }
        },

        // Water
        {
            id: "water",
            source: "mapbox",
            "source-layer": "water",
            type: "fill",
            paint: {
                "fill-color": "#d0d0d0"
            }
        },

        // Buildings - "Figure"
        // User wants: Not uniformly black, black outline, "fine horizontal cross hatch"
        // Simulating hatch with a textured grey or just a clean fill + outline.
        {
            id: "building-fill",
            source: "mapbox",
            "source-layer": "building",
            type: "fill",
            paint: {
                // Using a darker warm grey to stand out from lots, but not black
                "fill-color": "#b0aead",
                "fill-opacity": 0.8
            }
        },
        {
            id: "building-outline",
            source: "mapbox",
            "source-layer": "building",
            type: "line",
            paint: {
                "line-color": "#000000",
                "line-width": 1
            }
        },

        // Roads - Solid Color Fill
        {
            id: "road-fill",
            source: "mapbox",
            "source-layer": "road",
            type: "line",
            layout: {
                "line-cap": "round",
                "line-join": "round"
            },
            paint: {
                "line-color": "#cccccc", // Darker grey for streets
                "line-width": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    12, 1,
                    15, 3,
                    18, 10
                ]
            }
        },



        // Road labels
        {
            id: "road-label",
            source: "mapbox",
            "source-layer": "road",
            type: "symbol",
            layout: {
                "text-field": ["get", "name"],
                "text-font": ["Arial Unicode MS Regular"],
                "text-size": 12,
                "text-transform": "uppercase",
                "text-letter-spacing": 0.1
            },
            paint: {
                "text-color": "#000000",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1
            }
        },

        // POI labels
        {
            id: "poi-label",
            source: "mapbox",
            "source-layer": "poi_label",
            type: "symbol",
            minzoom: 15,
            layout: {
                "text-field": ["get", "name"],
                "text-font": ["Arial Unicode MS Regular"],
                "text-size": 10,
                "text-max-width": 8
            },
            paint: {
                "text-color": "#4a4a4a",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1
            }
        }
    ]
};
