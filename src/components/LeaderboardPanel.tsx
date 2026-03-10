import { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useBlockLeaderboard } from '../lib/useBlockLeaderboard';
import { useNeighborhoodLeaderboard } from '../lib/useNeighborhoodLeaderboard';
import type { GameState } from '../lib/gameState';
import type { LeaderboardEntry, LeaderboardTier } from '../lib/leaderboardTypes';
import './LeaderboardPanel.css';

interface LeaderboardPanelProps {
    isOpen: boolean;
    onClose: () => void;
    claims: GameState;
    myId?: string;
    userLat?: number;
    userLng?: number;
}

const TIER_CONFIG: Record<LeaderboardTier, { label: string; dotColor: string; scoreLabel: string }> = {
    block: { label: 'Right Here', dotColor: '#3b82f6', scoreLabel: 'tiles' },
    neighborhood: { label: 'Neighborhood', dotColor: '#eab308', scoreLabel: 'score' },
    district: { label: 'District', dotColor: '#ef4444', scoreLabel: 'score' },
};

function getRankClass(rank: number): string {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
}

function getRankDisplay(rank: number): string {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
}

function EntryRow({ entry, scoreLabel, pinned }: { entry: LeaderboardEntry; scoreLabel: string; pinned?: boolean }) {
    return (
        <div className={`lb-entry ${entry.isMe ? 'is-me' : ''} ${pinned ? 'pinned-me' : ''}`}>
            <span className={`lb-rank ${getRankClass(entry.rank)}`}>
                {getRankDisplay(entry.rank)}
            </span>
            <div className="lb-color-swatch" style={{ backgroundColor: entry.color }} />
            <div className="lb-info">
                <div className="lb-name">{entry.explorerName}{entry.isMe ? ' (You)' : ''}</div>
                <div className="lb-player-rank">{entry.playerRank}</div>
            </div>
            <div>
                <span className="lb-score">{entry.score}</span>
                <span className="lb-score-label">{scoreLabel}</span>
            </div>
        </div>
    );
}

export function LeaderboardPanel({ isOpen, onClose, claims, myId, userLat, userLng }: LeaderboardPanelProps) {
    const [activeTier, setActiveTier] = useState<LeaderboardTier>('block');

    // Tier 1: Block (always computed)
    const block = useBlockLeaderboard(claims, myId);

    // Tier 2: Neighborhood (fetched on demand)
    const neighborhood = useNeighborhoodLeaderboard(
        isOpen ? userLat : undefined,  // Only fetch when panel is open
        isOpen ? userLng : undefined,
        myId
    );

    if (!isOpen) return null;

    const renderTierContent = () => {
        if (activeTier === 'block') {
            return renderEntries(block.entries, block.myRank, block.myScore, 'tiles', false, null);
        }

        if (activeTier === 'neighborhood') {
            if (neighborhood.loading) {
                return (
                    <div className="lb-loading">
                        <div className="lb-loading-spinner" />
                        <div>Scanning neighborhood...</div>
                    </div>
                );
            }
            if (neighborhood.error) {
                return (
                    <div className="lb-error">
                        <div>{neighborhood.error}</div>
                        <button className="lb-refresh-btn" onClick={neighborhood.refresh} style={{ marginTop: 8 }}>
                            Try Again
                        </button>
                    </div>
                );
            }
            return renderEntries(
                neighborhood.entries,
                neighborhood.myRank,
                neighborhood.myScore,
                'score',
                true,
                neighborhood.refresh
            );
        }

        // District tier (not implemented yet)
        return (
            <div className="lb-empty">
                <div className="lb-empty-icon">🏗️</div>
                <div>District leaderboard coming soon!</div>
            </div>
        );
    };

    const renderEntries = (
        entries: LeaderboardEntry[],
        myRank: number,
        myScore: number,
        scoreLabel: string,
        showRefresh: boolean,
        onRefresh: (() => void) | null,
    ) => {
        if (entries.length === 0) {
            return (
                <div className="lb-empty">
                    <div className="lb-empty-icon">🗺️</div>
                    <div>No explorers in this area yet.</div>
                    <div style={{ fontSize: 12, marginTop: 4, color: '#475569' }}>Be the first to claim land here!</div>
                </div>
            );
        }

        const meInList = entries.some(e => e.isMe);

        return (
            <div className="lb-list">
                {showRefresh && onRefresh && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                        <button className="lb-refresh-btn" onClick={onRefresh}>
                            <RefreshCw style={{ width: 10, height: 10, display: 'inline', marginRight: 4 }} />
                            Refresh
                        </button>
                    </div>
                )}
                {entries.map(entry => (
                    <EntryRow key={entry.playerId} entry={entry} scoreLabel={scoreLabel} />
                ))}
                {!meInList && myRank > 0 && (
                    <EntryRow
                        entry={{
                            rank: myRank,
                            playerId: myId || '',
                            explorerName: 'You',
                            color: entries[0]?.color || '#6366f1',
                            playerRank: '',
                            score: myScore,
                            isMe: true,
                        }}
                        scoreLabel={scoreLabel}
                        pinned
                    />
                )}
            </div>
        );
    };

    return (
        <div className="leaderboard-overlay" onClick={onClose}>
            <div className="leaderboard-sheet" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="leaderboard-header">
                    <div className="leaderboard-title">
                        🏆 Leaderboard
                    </div>
                    <button className="leaderboard-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="lb-tabs">
                    {(['block', 'neighborhood'] as LeaderboardTier[]).map(tier => (
                        <button
                            key={tier}
                            className={`lb-tab ${activeTier === tier ? 'active' : ''}`}
                            onClick={() => setActiveTier(tier)}
                        >
                            <span className="lb-tab-dot" style={{ backgroundColor: TIER_CONFIG[tier].dotColor }} />
                            {TIER_CONFIG[tier].label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {renderTierContent()}
            </div>
        </div>
    );
}
