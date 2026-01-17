import { Polygon } from 'react-leaflet';
import { getGridSquareBounds } from '../lib/gridSystem';
import type { Territory } from '../lib/gameState';

interface TerritoryRendererProps {
    territories: Territory[];
}

export function TerritoryRenderer({ territories }: TerritoryRendererProps) {
    return (
        <>
            {territories.map((territory) => {
                if (!territory.isActive) return null;

                // Render enclosed squares with transparent fill
                return territory.enclosedSquares.map((gridKey) => {
                    const bounds = getGridSquareBounds(gridKey);
                    return (
                        <Polygon
                            key={`territory-${territory.id}-${gridKey}`}
                            positions={bounds}
                            pathOptions={{
                                color: territory.color,
                                fillColor: territory.color,
                                fillOpacity: 0.25, // More transparent than regular squares
                                weight: 0.5,
                                opacity: 0.5
                            }}
                        />
                    );
                });
            })}
        </>
    );
}
