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
    glyphs: "mapbox://fonts/charlie-yawitz/{fontstack}/{range}.pbf",
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
                "fill-color": "#a0a0a0"
            }
        },

        // Buildings - "Figure" with horizontal hatch pattern
        // Pattern is registered at runtime via nolliPatterns.ts
        // Falls back to solid fill if pattern not yet loaded
        {
            id: "building-fill",
            source: "mapbox",
            "source-layer": "building",
            type: "fill",
            paint: {
                "fill-pattern": "nolli-building-hatch",
                "fill-opacity": 0.9
            }
        },
        {
            id: "building-outline",
            source: "mapbox",
            "source-layer": "building",
            type: "line",
            paint: {
                "line-color": "#222222",
                "line-width": 1.2
            }
        },

        // Parks & Gardens — stylized tree-top pattern
        {
            id: "park-fill",
            source: "mapbox",
            "source-layer": "landuse",
            type: "fill",
            filter: ["in", "class", "park", "garden", "playground", "pitch"],
            paint: {
                "fill-pattern": "nolli-park",
                "fill-opacity": 0.85
            }
        },

        // Forest / Woodland — denser tree pattern
        {
            id: "forest-fill",
            source: "mapbox",
            "source-layer": "landuse",
            type: "fill",
            filter: ["in", "class", "wood", "scrub", "national_park"],
            paint: {
                "fill-pattern": "nolli-forest",
                "fill-opacity": 0.85
            }
        },

        // Agriculture — furrow pattern with grass
        {
            id: "agriculture-fill",
            source: "mapbox",
            "source-layer": "landuse",
            type: "fill",
            filter: ["in", "class", "agriculture", "grass", "meadow"],
            paint: {
                "fill-pattern": "nolli-agriculture",
                "fill-opacity": 0.85
            }
        },

        // =========================================================
        // ROADS — Classified by type (Nolli: public = void/white)
        // =========================================================

        // Major roads casing (dark edge for definition)
        {
            id: "road-major-casing",
            source: "mapbox",
            "source-layer": "road",
            type: "line",
            filter: ["in", "class", "motorway", "trunk", "primary", "secondary"],
            layout: {
                "line-cap": "round",
                "line-join": "round"
            },
            paint: {
                "line-color": "#b0b0b0",
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    12, 2,
                    15, 6,
                    18, 16
                ]
            }
        },
        // Major roads fill (white — public void)
        {
            id: "road-major-fill",
            source: "mapbox",
            "source-layer": "road",
            type: "line",
            filter: ["in", "class", "motorway", "trunk", "primary", "secondary"],
            layout: {
                "line-cap": "round",
                "line-join": "round"
            },
            paint: {
                "line-color": "#ffffff",
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    12, 1.5,
                    15, 5,
                    18, 14
                ]
            }
        },

        // Local streets casing
        {
            id: "road-street-casing",
            source: "mapbox",
            "source-layer": "road",
            type: "line",
            filter: ["in", "class", "tertiary", "street", "street_limited"],
            layout: {
                "line-cap": "round",
                "line-join": "round"
            },
            paint: {
                "line-color": "#c0c0c0",
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    12, 0.5,
                    15, 3,
                    18, 10
                ]
            }
        },
        // Local streets fill (white — public void)
        {
            id: "road-street-fill",
            source: "mapbox",
            "source-layer": "road",
            type: "line",
            filter: ["in", "class", "tertiary", "street", "street_limited"],
            layout: {
                "line-cap": "round",
                "line-join": "round"
            },
            paint: {
                "line-color": "#ffffff",
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    12, 0,
                    15, 2,
                    18, 8
                ]
            }
        },

        // Service roads & driveways (private — subtle, thin, grey)
        {
            id: "road-service",
            source: "mapbox",
            "source-layer": "road",
            type: "line",
            filter: ["in", "class", "service", "driveway"],
            layout: {
                "line-cap": "round",
                "line-join": "round"
            },
            paint: {
                "line-color": "#d5d3ca",
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0.5,
                    18, 3
                ]
            }
        },

        // Pedestrian & paths (dashed — walkable but not vehicular)
        {
            id: "road-path",
            source: "mapbox",
            "source-layer": "road",
            type: "line",
            filter: ["in", "class", "path", "pedestrian", "track"],
            layout: {
                "line-cap": "round",
                "line-join": "round"
            },
            paint: {
                "line-color": "#b8b8b8",
                "line-width": [
                    "interpolate", ["linear"], ["zoom"],
                    15, 0.5,
                    18, 2
                ],
                "line-dasharray": [2, 2]
            }
        },



        // Road labels
        {
            id: "road-label",
            source: "mapbox",
            "source-layer": "road",
            type: "symbol",
            layout: {
                "symbol-placement": "line",
                "symbol-spacing": 300,
                "text-field": ["get", "name"],
                "text-font": ["Cormorant Garamond Italic", "DIN Offc Pro Italic", "Arial Unicode MS Regular"],
                "text-size": 11,
                "text-transform": "uppercase",
                "text-letter-spacing": 0.15
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
                "text-font": ["Cormorant Garamond Italic", "DIN Offc Pro Italic", "Arial Unicode MS Regular"],
                "text-size": 14,
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
