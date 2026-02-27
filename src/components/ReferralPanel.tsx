import { useState, useEffect } from 'react';
import { X, Copy, Share2, Users, Coins } from 'lucide-react';
import {
    generateReferralCode,
    shareReferralLink,
    getReferralStats,
    type ReferralStats
} from '../lib/referralService';

interface ReferralPanelProps {
    isOpen: boolean;
    onClose: () => void;
    playerId: string;
}

export function ReferralPanel({ isOpen, onClose, playerId }: ReferralPanelProps) {
    const [stats, setStats] = useState<ReferralStats>({ friendsJoined: 0, coinsEarned: 0 });
    const [copied, setCopied] = useState(false);

    const code = generateReferralCode(playerId);

    useEffect(() => {
        if (!isOpen || !playerId) return;
        getReferralStats(playerId).then(setStats);
    }, [isOpen, playerId]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback handled by share
        }
    };

    const handleShare = () => {
        shareReferralLink(code);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[3000] flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">📨 Invite Friends</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-300" />
                    </button>
                </div>

                {/* Description */}
                <p className="text-slate-300 text-sm">
                    Share your friend code! You earn coins when they join and play.
                </p>

                {/* Referral Code Display */}
                <div className="bg-slate-900 rounded-xl p-4 flex items-center justify-between border border-slate-700">
                    <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Your Friend Code</div>
                        <div className="text-3xl font-mono font-bold text-yellow-400 tracking-[0.3em]">{code}</div>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        title="Copy code"
                    >
                        <Copy className={`w-5 h-5 ${copied ? 'text-green-400' : 'text-slate-300'}`} />
                    </button>
                </div>

                {copied && (
                    <div className="text-green-400 text-sm text-center font-medium">
                        ✓ Copied to clipboard!
                    </div>
                )}

                {/* Share Button */}
                <button
                    onClick={handleShare}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:from-blue-400 hover:to-indigo-500 active:scale-[0.98] transition-all shadow-lg"
                >
                    <Share2 className="w-5 h-5" />
                    Share with Friends
                </button>

                {/* Rewards Info */}
                <div className="bg-slate-700/50 rounded-xl p-4 space-y-3 border border-slate-600">
                    <div className="text-slate-300 font-semibold text-sm">Invite Rewards</div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-300">
                            <span>🎉 Friend signs up</span>
                            <span className="text-yellow-400 font-bold">+10 coins</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <span>🗺️ Friend claims 10 tiles</span>
                            <span className="text-yellow-400 font-bold">+25 coins</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <span>🏰 Friend captures territory</span>
                            <span className="text-yellow-400 font-bold">+50 coins</span>
                        </div>
                        <div className="border-t border-slate-600 pt-2 flex justify-between text-slate-200 font-semibold">
                            <span>Max per friend</span>
                            <span className="text-yellow-400">85 coins</span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4">
                    <div className="flex-1 bg-slate-900 rounded-xl p-4 text-center border border-slate-700">
                        <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-white">{stats.friendsJoined}</div>
                        <div className="text-xs text-slate-400">Friends Joined</div>
                    </div>
                    <div className="flex-1 bg-slate-900 rounded-xl p-4 text-center border border-slate-700">
                        <Coins className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-yellow-400">{stats.coinsEarned}</div>
                        <div className="text-xs text-slate-400">Coins Earned</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
