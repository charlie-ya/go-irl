import { useState, useEffect } from 'react';
import type { Nest, NestVisit } from '../lib/nests';
import { upgradeNest, visitNest } from '../lib/nests';
import { fetchNestVisits } from '../lib/useNests';
import { auth } from '../lib/firebase';
import { calculateDistance } from '../lib/geohashUtils';

interface NestModalProps {
    nest: Nest | null;
    userLat: number | null;
    userLng: number | null;
    onClose: () => void;
}

export function NestModal({ nest, userLat, userLng, onClose }: NestModalProps) {
    const user = auth.currentUser;
    const [visits, setVisits] = useState<NestVisit[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [earnedAmount, setEarnedAmount] = useState(0);

    useEffect(() => {
        if (nest) {
            fetchNestVisits(nest.id).then(setVisits).catch(e => console.error("Failed to load visits:", e));
        }
    }, [nest]);

    if (!nest) return null;

    const isOwner = user?.uid === nest.ownerId;
    const distanceToNest = userLat && userLng ? calculateDistance(userLat, userLng, nest.location.latitude, nest.location.longitude) : Infinity;
    const isCloseEnough = distanceToNest <= 20; // 20 meters

    const handleVisit = async () => {
        if (!user || !user.displayName) {
            setError("You must be logged in with a profile name to sign the guestbook.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await visitNest(nest.id, user.displayName);
            setEarnedAmount(res.visitorReward);
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 3000); // hide celebration after 3 seconds
            
            // Refresh visits
            const updated = await fetchNestVisits(nest.id);
            setVisits(updated);
        } catch (e: any) {
            setError(e.message || "Failed to sign guestbook.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        setLoading(true);
        setError(null);
        try {
            await upgradeNest();
        } catch (e: any) {
            setError(e.message || "Failed to upgrade nest.");
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (level: number) => {
        const src = level === 1 ? '/assets/nests/nest_level1.png' : level === 2 ? '/assets/nests/nest_level2.png' : '/assets/nests/nest_level3.png';
        return <img src={src} alt={getLevelName(level)} className="w-8 h-8 object-contain inline-block" />;
    };

    const getLevelName = (level: number) => {
        if (level === 1) return 'Nest';
        if (level === 2) return 'Dovecote';
        return 'Eyrie';
    };

    const getRewardsForLevel = (level: number) => {
        if (level === 1) return { visitor: 5, owner: 0 };
        if (level === 2) return { visitor: 10, owner: 5 };
        return { visitor: 20, owner: 10 };
    };

    const currentRewards = getRewardsForLevel(nest.level);
    const nextRewards = nest.level < 3 ? getRewardsForLevel(nest.level + 1) : null;
    const upgradeCost = nest.level === 1 ? 500 : 1000;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border-2 border-amber-500/50 rounded-xl max-w-md w-full shadow-[0_0_20px_rgba(245,158,11,0.2)] overflow-hidden relative">
                
                {/* Celebration Overlay */}
                {showCelebration && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="text-6xl mb-4 animate-bounce">🪙</div>
                        <h2 className="text-2xl font-black text-amber-400 mb-2">Guestbook Signed!</h2>
                        <p className="text-white text-lg font-bold">You earned +{earnedAmount} coins</p>
                    </div>
                )}

                <div className="p-4 bg-amber-500/10 border-b border-amber-500/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 filter drop-shadow-md">{getIcon(nest.level)}</div>
                        <div>
                            <h2 className="text-xl font-bold text-amber-500">{nest.title}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    {getLevelName(nest.level)}
                                </span>
                                <span className="text-xs text-slate-400">• {nest.totalUniqueVisitors} unique visitors</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">✕</button>
                </div>

                <div className="p-6 space-y-5">
                    {error && <div className="p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded text-sm">{error}</div>}

                    {/* Reward Info Panel - Always visible */}
                    <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Rewards</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-slate-900 rounded p-2 text-center border border-slate-700/50">
                                <div className="text-slate-400 text-xs mb-1">Visitor gets</div>
                                <div className="font-bold text-amber-400">{currentRewards.visitor} coins</div>
                            </div>
                            <div className="bg-slate-900 rounded p-2 text-center border border-slate-700/50">
                                <div className="text-slate-400 text-xs mb-1">Owner gets</div>
                                <div className="font-bold text-amber-400">{currentRewards.owner} coins</div>
                            </div>
                        </div>
                    </div>

                    {isOwner ? (
                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-inner">
                            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                                <span>Manage Your Nest</span>
                            </h3>
                            
                            {nest.level < 3 && nextRewards ? (
                                <div className="space-y-4">
                                    {nest.level === 1 && (
                                        <p className="text-amber-400/90 text-sm font-medium bg-amber-900/20 p-2 rounded border border-amber-500/20">
                                            Level 1 Nests don't generate coins for you. Upgrade to start earning from visitors!
                                        </p>
                                    )}
                                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 text-sm">
                                        <div className="text-slate-400 mb-2">After upgrade to <span className="text-white font-bold">{getLevelName(nest.level + 1)}</span>:</div>
                                        <ul className="space-y-1 text-slate-300">
                                            <li className="flex justify-between"><span>Visitor reward:</span> <span className="text-emerald-400 font-bold">{nextRewards.visitor} coins</span></li>
                                            <li className="flex justify-between"><span>Owner reward:</span> <span className="text-emerald-400 font-bold">{nextRewards.owner} coins</span></li>
                                        </ul>
                                    </div>
                                    <button 
                                        onClick={handleUpgrade}
                                        disabled={loading}
                                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-black rounded-lg shadow-lg hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 transition-all active:scale-95"
                                    >
                                        Upgrade for {upgradeCost} coins
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-amber-900/30 border border-amber-500/50 p-4 rounded-lg text-center">
                                    <div className="text-3xl mb-2">🏆</div>
                                    <p className="text-amber-400 font-bold">Max Level Reached!</p>
                                    <p className="text-amber-200/80 text-xs mt-1">Your Eyrie is generating maximum rewards.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center shadow-inner">
                            <h3 className="font-bold text-white mb-3">Guestbook</h3>
                            {!isCloseEnough ? (
                                <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                                    <p className="text-sm text-amber-500/90 font-medium">You are too far away to sign the guestbook.</p>
                                    <p className="text-xs text-slate-400 mt-1">Get closer to the nest to interact!</p>
                                </div>
                            ) : (
                                <button 
                                    onClick={handleVisit}
                                    disabled={loading || showCelebration}
                                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-black rounded-lg shadow-lg hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    Sign Guestbook & Collect {currentRewards.visitor} Coins
                                </button>
                            )}
                        </div>
                    )}

                    <div>
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Visitors</h4>
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {visits.length === 0 ? (
                                <div className="text-center p-4 bg-slate-800/50 rounded-lg border border-slate-700 border-dashed">
                                    <p className="text-slate-400 text-sm font-medium">Be the first to sign this guestbook! 📝</p>
                                </div>
                            ) : (
                                visits.map(v => (
                                    <div key={v.visitorId + v.visitedAt} className="flex justify-between items-center text-sm p-2 bg-slate-800 rounded border border-slate-700/50">
                                        <span className="text-white font-medium">{v.visitorName}</span>
                                        <span className="text-slate-500 text-xs">{new Date(v.visitedAt).toLocaleDateString()}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
