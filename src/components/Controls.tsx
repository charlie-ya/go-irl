import { MapPin, Zap, Check, ShoppingCart, Shield, Crown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { getGridKey } from '../lib/gridSystem';
import { OfferModal } from './OfferModal';
import type { Offer } from '../lib/gameState';

function timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

interface ControlsProps {
    lat: number;
    lng: number;
    locationLoading: boolean;
    selectedGridKey: string | null;
    selectionOffset: { latOffset: number; lngOffset: number };
    onOffsetChange: React.Dispatch<React.SetStateAction<{ latOffset: number; lngOffset: number }>>;
    onClaim: (key: string) => Promise<{ bonus: number; capturedCount: number }>;
    onMakeOffer: (key: string, amount: number) => void;
    userBalance: number;
    onGetCoins: () => void;

    // Ceremony Props
    onStartCeremony: () => void;
    onAffirm: (key: string) => void;
    onCompleteCeremony: (key: string) => void;
    activeCeremony: { id: string; affirmations: string[]; ownerId: string } | null;
    playerRank: string;

    myId: string;
    myColor: string;
    claims: Record<string, { ownerId: string; color: string; status?: string }>;
    myOutgoingOffers: Offer[];
}

export function Controls({
    lat, lng, locationLoading, selectedGridKey, selectionOffset, onOffsetChange,
    onClaim, onMakeOffer, userBalance, onGetCoins,
    onStartCeremony, onAffirm, onCompleteCeremony, activeCeremony, playerRank,
    myId, myColor, claims, myOutgoingOffers
}: ControlsProps) {
    const currentKey = locationLoading ? '...' : getGridKey(lat, lng);
    const activeKey = selectedGridKey || currentKey;
    const tile = claims[activeKey];
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [showAscendDialog, setShowAscendDialog] = useState(false);

    const isOwnedByMe = tile && tile.ownerId === myId;
    // For claiming mechanics, a moribund square acts as if it is unowned
    const isOwnedByOther = tile && tile.ownerId !== myId && tile.status !== 'moribund';
    const isCapturedByOther = tile?.status === 'captured' && tile.ownerId !== myId;
    const myPendingOffer = myOutgoingOffers.find(o => o.tileKey === activeKey);

    // Check if there is an active ceremony here
    const ceremonyHere = activeCeremony && activeCeremony.id === activeKey ? activeCeremony : null;

    // Check if player is eligible for rank promotion
    const canAscend = playerRank !== 'Centurion';
    const isMinionOrCenturion = playerRank === 'Minion' || playerRank === 'Centurion';

    const handleMove = (dLat: number, dLng: number) => {
        onOffsetChange(prev => {
            const newLat = Math.max(-1, Math.min(1, prev.latOffset + dLat));
            const newLng = Math.max(-1, Math.min(1, prev.lngOffset + dLng));
            return { latOffset: newLat, lngOffset: newLng };
        });
    };

    return (
        <div className="absolute bottom-28 left-0 right-0 px-4 z-[1000] flex flex-col items-center gap-4">

            {/* --- DIRECTIONAL CONTROLS (Minion+) --- */}
            {isMinionOrCenturion && !locationLoading && (
                <div className="flex items-center gap-1 bg-slate-900/90 p-2 rounded-2xl backdrop-blur-md border border-slate-700 shadow-2xl pointer-events-auto">
                    <button onClick={() => handleMove(0, -1)} disabled={selectionOffset.lngOffset <= -1} className="p-3 bg-slate-800 rounded-xl text-white hover:bg-slate-700 disabled:opacity-30 active:scale-95 transition-all"><ChevronLeft size={24}/></button>
                    <div className="flex flex-col gap-1">
                        <button onClick={() => handleMove(1, 0)} disabled={selectionOffset.latOffset >= 1} className="p-3 bg-slate-800 rounded-xl text-white hover:bg-slate-700 disabled:opacity-30 active:scale-95 transition-all"><ChevronUp size={24}/></button>
                        <button onClick={() => handleMove(-1, 0)} disabled={selectionOffset.latOffset <= -1} className="p-3 bg-slate-800 rounded-xl text-white hover:bg-slate-700 disabled:opacity-30 active:scale-95 transition-all"><ChevronDown size={24}/></button>
                    </div>
                    <button onClick={() => handleMove(0, 1)} disabled={selectionOffset.lngOffset >= 1} className="p-3 bg-slate-800 rounded-xl text-white hover:bg-slate-700 disabled:opacity-30 active:scale-95 transition-all"><ChevronRight size={24}/></button>
                </div>
            )}

            {/* --- OWNER VIEW --- */}
            {isOwnedByMe && (
                <div className="flex flex-col gap-2 items-center bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-xl scale-90 origin-bottom">
                    {!ceremonyHere ? (
                        <>
                            <div className="flex items-center gap-3 bg-slate-800/80 px-6 py-3 rounded-full border border-white/10 shadow-lg backdrop-blur-sm">
                                <Check className="w-5 h-5 text-green-400" />
                                <div className="font-black text-white uppercase tracking-wider text-base">
                                    Claimed!
                                </div>
                            </div>
                            {canAscend && (
                                <button
                                    onClick={() => setShowAscendDialog(true)}
                                    className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 active:scale-95 touch-manipulation text-white text-xs px-4 py-2 rounded-full shadow-lg border border-yellow-300/50 font-bold transition-transform min-h-[32px]"
                                >
                                    <Crown className="w-4 h-4" />
                                    Ascend to New Rank
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-yellow-400 text-[10px] font-mono uppercase tracking-widest">
                                • Ceremony •
                            </div>
                            <div className="text-xl font-black text-white">
                                {ceremonyHere.affirmations.length} <span className="text-xs font-normal text-slate-400">/ 9 affirmations</span>
                            </div>
                            <button
                                onClick={() => onCompleteCeremony(activeKey)}
                                disabled={ceremonyHere.affirmations.length < 9}
                                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 active:scale-95 touch-manipulation disabled:from-slate-600 disabled:to-slate-700 disabled:border-slate-500 text-white text-[10px] px-4 py-2 rounded-full shadow-lg border border-yellow-300 font-bold transition-transform min-h-[36px]"
                            >
                                {ceremonyHere.affirmations.length >= 9 ? 'CLAIM PROMOTION' : `Need ${9 - ceremonyHere.affirmations.length} more`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* --- GUEST VIEW (Ceremony Active) --- */}
            {isOwnedByOther && ceremonyHere && (
                <div className="flex flex-col gap-2 items-center bg-indigo-900/90 p-4 rounded-xl border border-indigo-400/30 shadow-2xl animate-pulse">
                    <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Promotion Ceremony In Progress</div>
                    <div className="text-white font-bold text-center text-sm">
                        Help the owner rise in rank!
                    </div>
                    <button
                        onClick={() => onAffirm(activeKey)}
                        disabled={ceremonyHere.affirmations.includes(myId)}
                        className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 touch-manipulation disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm px-6 py-2 rounded-full shadow-lg font-bold transition-all min-h-[40px]"
                    >
                        {ceremonyHere.affirmations.includes(myId) ? "Affirmed! 🫡" : "AFFIRM 🙌"}
                    </button>
                </div>
            )}


            <div className="bg-slate-900/80 backdrop-blur-md text-white p-3 px-4 rounded-lg shadow-lg flex items-center gap-3 border border-slate-700">
                <MapPin className="text-blue-400 w-5 h-5" />
                <div className="text-xs font-mono leading-tight">
                    <div>LAT: {lat?.toFixed(4)}</div>
                    <div>LNG: {lng?.toFixed(4)}</div>
                </div>
            </div>

            {/* --- CAPTURED TERRITORY (non-interactive) --- */}
            {!isOwnedByMe && isCapturedByOther && (
                <div className="flex items-center gap-3 bg-slate-800/80 px-6 py-3 rounded-full border border-amber-500/30 shadow-lg backdrop-blur-sm">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <div className="font-bold text-amber-300 uppercase tracking-wider text-sm">
                        Captured Territory
                    </div>
                </div>
            )}

            {/* --- PENDING OFFER (informational) --- */}
            {!isOwnedByMe && !isCapturedByOther && myPendingOffer && (
                <div className="flex items-center gap-3 bg-slate-800/80 px-6 py-3 rounded-full border border-emerald-500/30 shadow-lg backdrop-blur-sm">
                    <ShoppingCart className="w-5 h-5 text-emerald-400" />
                    <div className="font-semibold text-emerald-300 text-sm">
                        You offered {myPendingOffer.amount} coins {timeAgo(myPendingOffer.createdAt)}
                    </div>
                </div>
            )}

            {/* Standard Claim/Offer Button */}
            {!isOwnedByMe && !isCapturedByOther && !myPendingOffer && (
                <>
                    <button
                        onClick={() => {
                            if (isOwnedByOther) {
                                setShowOfferModal(true);
                            } else if (userBalance < 1) {
                                onGetCoins();
                            } else {
                                onClaim(activeKey);
                            }
                        }}
                        disabled={locationLoading}
                        className={`transition-all duration-300 font-bold py-4 px-8 rounded-full shadow-2xl flex items-center gap-3 text-lg border-2 
                            ${isOwnedByOther
                                ? 'active:scale-95 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-white/20'
                                : 'active:scale-95 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-white/20'
                            }`}
                        style={{
                            boxShadow: `0 0 20px ${isOwnedByOther ? '#10b981' : myColor}40`
                        }}
                    >
                        {isOwnedByOther ? (
                            <>
                                <ShoppingCart className="w-5 h-5" />
                                MAKE OFFER
                            </>
                        ) : (
                            <>
                                <Zap className="fill-current w-5 h-5" />
                                CLAIM FOR 1 COIN
                            </>
                        )}
                    </button>

                    {/* Offer Modal */}
                    <OfferModal
                        isOpen={showOfferModal}
                        onClose={() => setShowOfferModal(false)}
                        onSubmit={(amount) => onMakeOffer(activeKey, amount)}
                        maxBid={userBalance}
                        minBid={2}
                    />
                </>
            )}

            {/* Ascend Dialog Overlay */}
            {showAscendDialog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-6">
                    <div className="bg-slate-800/95 rounded-2xl p-6 max-w-sm w-full border border-amber-500/30 shadow-2xl">
                        <div className="text-center">
                            <div className="text-4xl mb-3">👑</div>
                            <h2 className="text-xl font-bold text-white mb-2">Ascend to New Rank</h2>
                            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                                To ascend to the rank of <strong className="text-amber-400">Minion</strong>, gather <strong className="text-amber-400">9 other players</strong> on this square.
                                Each player must affirm your promotion by tapping the AFFIRM button.
                            </p>
                            <p className="text-slate-400 text-xs leading-relaxed mb-6">
                                Minions can see more surrounding territory, and can claim squares adjacent to their location. New powers will be added soon!
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setShowAscendDialog(false);
                                        onStartCeremony();
                                    }}
                                    className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-amber-500/30 transition-all active:scale-95 border border-yellow-300/40"
                                >
                                    Ascend ✨
                                </button>
                                <button
                                    onClick={() => setShowAscendDialog(false)}
                                    className="w-full text-slate-400 hover:text-slate-300 py-2 text-sm font-medium transition-colors"
                                >
                                    Not Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
