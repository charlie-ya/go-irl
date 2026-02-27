import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/mapbox';
import { getGridSquareBounds } from '../lib/gridSystem';
import type { Territory } from '../lib/gameState';

interface TerritoryRendererProps {
    territories: Territory[];
}

export function TerritoryRenderer({ territories }: TerritoryRendererProps) {
    const geoJSON = useMemo(() => {
        const features: any[] = [];
        const renderedSquares = new Set<string>();

        territories.forEach((territory) => {
            if (!territory.isActive) return;

            territory.enclosedSquares.forEach((gridKey) => {
                if (!renderedSquares.has(gridKey)) {
                    renderedSquares.add(gridKey);

                    const bounds = getGridSquareBounds(gridKey);
                    // Convert [[lat, lng], ...] to [[lng, lat], ...] and close loop
                    const coords = bounds.map(coord => [coord[1], coord[0]]);
                    coords.push(coords[0]);

                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [coords]
                        },
                        properties: {
                            territoryId: territory.id,
                            color: territory.color
                        }
                    });
                }
            });
        });

        return {
            type: 'FeatureCollection',
            features
        };
    }, [territories]);

    return (
        <Source id="territories-source" type="geojson" data={geoJSON as any}>
            <Layer
                id="territory-fill"
                type="fill"
                paint={{
                    'fill-color': ['get', 'color'],
                    'fill-opacity': 0.25
                }}
            />
            <Layer
                id="territory-outline" // Optional: highlight territory borders?
                type="line"
                paint={{
                    'line-color': ['get', 'color'],
                    'line-width': 1,
                    'line-opacity': 0.5
                }}
            />
        </Source>
    );
}
