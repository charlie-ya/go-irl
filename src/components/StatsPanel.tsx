import './StatsPanel.css';
import { Plus } from 'lucide-react';

interface StatsPanelProps {
    coins: number;
    tilesCount: number;
    territoriesCount: number;
    rank?: string;
    explorerName?: string;
    onGetCoins?: () => void;
}

export function StatsPanel({ coins, tilesCount, territoriesCount, rank, explorerName, onGetCoins }: StatsPanelProps) {
    const name = explorerName || 'Explorer';
    const userRank = rank || 'Vassal';

    return (
        <div className="stats-panel">
            <div className="stats-header">
                <span className="font-bold text-white">{name}</span>, a <span className="text-yellow-400 font-bold">{userRank}</span>
            </div>

            <div className="stats-grid">
                <div className="stat-row">
                    <span className="stat-label">Claimed:</span>
                    <span className="stat-val">{tilesCount}</span>
                </div>
                <div className="stat-row">
                    <span className="stat-label">Captured:</span>
                    <span className="stat-val">{territoriesCount}</span>
                </div>
                <div
                    className="stat-row coins-row"
                    onClick={onGetCoins}
                    role={onGetCoins ? "button" : undefined}
                    style={onGetCoins ? { cursor: 'pointer' } : undefined}
                >
                    <span className="stat-icon-small">🪙</span>
                    <span className="stat-val text-yellow-300">{coins}</span>
                    {onGetCoins && (
                        <Plus className="w-4 h-4 text-yellow-400/60 ml-1" />
                    )}
                </div>
            </div>
        </div>
    );
}
