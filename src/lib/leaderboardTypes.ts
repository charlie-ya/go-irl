export interface LeaderboardEntry {
    rank: number;
    playerId: string;
    explorerName: string;
    color: string;
    playerRank: string;       // 'Lowly Vassal' | 'Minion' | 'Centurion'
    score: number;
    isMe: boolean;
}

export type LeaderboardTier = 'block' | 'neighborhood' | 'district';
