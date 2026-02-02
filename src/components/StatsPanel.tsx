import './StatsPanel.css';

interface StatsPanelProps {
    coins: number;
    tilesCount: number;
    territoriesCount: number;
    rank?: string;
}

export function StatsPanel({ coins, tilesCount, territoriesCount, rank }: StatsPanelProps) {
    return (
        <div className="stats-panel">
            <div className="stat-item">
                <span className="stat-icon">🪙</span>
                <span className="stat-value">{coins}</span>
            </div>
            <div className="stat-item">
                <span className="stat-icon">📍</span>
                <span className="stat-value">{tilesCount}</span>
            </div>
            <div className="stat-item">
                <span className="stat-icon">🏆</span>
                <span className="stat-value">{territoriesCount}</span>
            </div>
            <div className="stat-item">
                <span className="stat-icon">👑</span>
                <span className="stat-value text-xs">{rank || 'Vassal'}</span>
            </div>
        </div>
    );
}
