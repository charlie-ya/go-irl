import './StatsPanel.css';

interface StatsPanelProps {
    coins: number;
    tilesCount: number;
    territoriesCount: number;
}

export function StatsPanel({ coins, tilesCount, territoriesCount }: StatsPanelProps) {
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
        </div>
    );
}
