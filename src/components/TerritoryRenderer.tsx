import { Polygon } from 'react-leaflet';
import { getGridSquareBounds } from '../lib/gridSystem';
import type { Territory } from '../lib/gameState';

interface TerritoryRendererProps {
    territories: Territory[];
}

export function TerritoryRenderer({ territories }: TerritoryRendererProps) {
    // Track which squares have been rendered to avoid duplicate overlays
    const renderedSquares = new Set<string>();
    const squaresToRender: Array<{ gridKey: string; color: string; territoryId: string }> = [];

    // Collect all unique enclosed squares
    territories.forEach((territory) => {
        if (!territory.isActive) return;

        territory.enclosedSquares.forEach((gridKey) => {
            if (!renderedSquares.has(gridKey)) {
                renderedSquares.add(gridKey);
                squaresToRender.push({
                    gridKey,
                    color: territory.color,
                    territoryId: territory.id
                });
            }
        });
    });

    return (
        <>
            {squaresToRender.map(({ gridKey, color, territoryId }) => {
                const bounds = getGridSquareBounds(gridKey);
                return (
                    <Polygon
                        key={`territory-${territoryId}-${gridKey}`}
                        positions={bounds}
                        pathOptions={{
                            color: color,
                            fillColor: color,
                            fillOpacity: 0.25, // More transparent than regular squares
                            weight: 0.5,
                            opacity: 0.5
                        }}
                    />
                );
            })}
        </>
    );
}
