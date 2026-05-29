import { Zap, Check, ShoppingCart, Shield, Footprints } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { getGridKey } from '../lib/gridSystem';
import { OfferModal } from './OfferModal';
import { VirtualJoystick } from './VirtualJoystick';
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
    onOffsetChange: React.Dispatch<React.SetStateAction<{ latOffset: number; lngOffset: number }>>;
    onClaim: (key: string) => Promise<{ bonus: number; capturedCount: number }>;
    onMakeOffer: (key: string, amount: number) => void;
    userBalance: number;
    onGetCoins: () => void;

    // Ceremony Props
    onAffirm: (key: string) => void;
    onCompleteCeremony: (key: string) => void;
    activeCeremony: { id: string; affirmations: string[]; ownerId: string } | null;
    playerRank: string;

    myId: string;
    myColor: string;
    claims: Record<string, { ownerId: string; color: string; status?: string }>;
    myOutgoingOffers: Offer[];
    tilesCount: number;
    territoriesCount: number;
    isAutoClaimEnabled: boolean;
    onToggleAutoClaim: () => void;
}

export function Controls({
    lat, lng, locationLoading, selectedGridKey, onOffsetChange,
    onClaim, onMakeOffer, userBalance, onGetCoins,
    onAffirm, onCompleteCeremony, activeCeremony, playerRank,
    myId, myColor, claims, myOutgoingOffers,
    tilesCount, territoriesCount, isAutoClaimEnabled, onToggleAutoClaim
}: ControlsProps) {
    const currentKey = locationLoading ? '...' : getGridKey(lat, lng);
    const activeKey = selectedGridKey || currentKey;
    const tile = claims[activeKey];
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [showAutoToast, setShowAutoToast] = useState(false);

    useEffect(() => {
        if (isAutoClaimEnabled) {
            setShowAutoToast(true);
            const timer = setTimeout(() => setShowAutoToast(false), 4000);
            return () => clearTimeout(timer);
        } else {
            setShowAutoToast(false);
        }
    }, [isAutoClaimEnabled]);

    const isOwnedByMe = tile && tile.ownerId === myId;
    // For claiming mechanics, a moribund square acts as if it is unowned
    const isOwnedByOther = tile && tile.ownerId !== myId && tile.status !== 'moribund';
    const isCapturedByOther = tile?.status === 'captured' && tile.ownerId !== myId;
    const myPendingOffer = myOutgoingOffers.find(o => o.tileKey === activeKey);

    // Check if there is an active ceremony here
    const ceremonyHere = activeCeremony && activeCeremony.id === activeKey ? activeCeremony : null;

    // Check if player is eligible for rank promotion
    const isMinionOrCenturion = playerRank === 'Minion' || playerRank === 'Centurion';

    const handleMove = (dLat: number, dLng: number) => {
        onOffsetChange(prev => {
            const newLat = Math.max(-1, Math.min(1, prev.latOffset + dLat));
            const newLng = Math.max(-1, Math.min(1, prev.lngOffset + dLng));
            return { latOffset: newLat, lngOffset: newLng };
        });
    };

    return (
        <div className="absolute bottom-24 left-0 right-0 px-3 z-[1000] flex flex-col items-center gap-3">

            {/* --- DIRECTIONAL JOYSTICK (Minion+) --- */}
            {isMinionOrCenturion && !locationLoading && (
                <div className="pointer-events-auto animate-in fade-in slide-in-from-bottom-4">
                    <VirtualJoystick onMove={handleMove} />
                </div>
            )}

            {/* --- OWNER VIEW --- */}
            {isOwnedByMe && (
                <div className="flex flex-col gap-1.5 items-center bg-slate-900/90 p-2 rounded-xl border border-white/10 shadow-xl scale-90 origin-bottom">
                    {!ceremonyHere ? (
                        <>
                            <div className="flex items-center gap-2 bg-slate-800/80 px-5 py-2 rounded-full border border-white/10 shadow-lg backdrop-blur-sm">
                                <Check className="w-4 h-4 text-green-400" />
                                <div className="font-black text-white uppercase tracking-wider text-sm">
                                    Claimed!
                                </div>
                            </div>
                            {/* Walk nudge: shown for the first 3 claims so users know to move */}
                            {tilesCount <= 3 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-900/80 border border-indigo-500/40 mt-0.5 animate-in fade-in">
                                    <Footprints className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                    <span className="text-indigo-200 text-[11px] font-medium">
                                        Walk to a new square to claim again!
                                    </span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-yellow-400 text-[10px] font-mono uppercase tracking-widest">
                                • Ceremony •
                            </div>
                            <div className="text-lg font-black text-white">
                                {ceremonyHere.affirmations.length} <span className="text-[10px] font-normal text-slate-400">/ 9 affirmations</span>
                            </div>
                            <button
                                onClick={() => onCompleteCeremony(activeKey)}
                                disabled={ceremonyHere.affirmations.length < 9}
                                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 active:scale-95 touch-manipulation disabled:from-slate-600 disabled:to-slate-700 disabled:border-slate-500 text-white text-[9px] px-3 py-1.5 rounded-full shadow-lg border border-yellow-300 font-bold transition-transform min-h-[30px]"
                            >
                                {ceremonyHere.affirmations.length >= 9 ? 'CLAIM PROMOTION' : `Need ${9 - ceremonyHere.affirmations.length} more`}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* --- GUEST VIEW (Ceremony Active) --- */}
            {isOwnedByOther && ceremonyHere && (
                <div className="flex flex-col gap-1.5 items-center bg-indigo-900/90 p-3 rounded-xl border border-indigo-400/30 shadow-2xl animate-pulse">
                    <div className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Promotion Ceremony In Progress</div>
                    <div className="text-white font-bold text-center text-xs">
                        Help the owner rise in rank!
                    </div>
                    <button
                        onClick={() => onAffirm(activeKey)}
                        disabled={ceremonyHere.affirmations.includes(myId)}
                        className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 touch-manipulation disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-xs px-5 py-1.5 rounded-full shadow-lg font-bold transition-all min-h-[32px]"
                    >
                        {ceremonyHere.affirmations.includes(myId) ? "Affirmed! 🫡" : "AFFIRM 🙌"}
                    </button>
                </div>
            )}




            {/* --- CAPTURED TERRITORY (non-interactive) --- */}
            {!isOwnedByMe && isCapturedByOther && (
                <div className="flex items-center gap-2 bg-slate-800/80 px-5 py-2 rounded-full border border-amber-500/30 shadow-lg backdrop-blur-sm">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <div className="font-bold text-amber-300 uppercase tracking-wider text-xs">
                        Captured Territory
                    </div>
                </div>
            )}

            {/* --- PENDING OFFER (informational) --- */}
            {!isOwnedByMe && !isCapturedByOther && myPendingOffer && (
                <div className="flex items-center gap-2 bg-slate-800/80 px-5 py-2 rounded-full border border-emerald-500/30 shadow-lg backdrop-blur-sm">
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <div className="font-semibold text-emerald-300 text-xs">
                        You offered {myPendingOffer.amount} coins {timeAgo(myPendingOffer.createdAt)}
                    </div>
                </div>
            )}

            {/* Grouped Button Area */}
            {(() => {
                const showClaimButton = !isOwnedByMe && !isCapturedByOther && !myPendingOffer;
                const showAutoButton = territoriesCount > 0;
                const groupButtons = showClaimButton && showAutoButton;

                if (!showClaimButton && !showAutoButton) return null;

                return (
                    <div className="flex flex-col items-center gap-3 transition-all duration-300">
                        {/* Capture hint */}
                        {showClaimButton && tilesCount >= 5 && territoriesCount === 0 && (
                            <div className="flex items-start gap-2.5 bg-amber-900/70 border border-amber-500/40 rounded-xl px-3 py-2 max-w-xs animate-in slide-in-from-bottom-2">
                                <span className="text-amber-400 text-lg flex-shrink-0 mt-0.5">💡</span>
                                <div>
                                    <p className="text-amber-200 text-xs font-semibold">Try a capture!</p>
                                    <p className="text-amber-300/80 text-[11px] leading-snug mt-0.5">
                                        Walk your claimed squares into a connected loop — the enclosed area fills automatically for bonus coins.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className={`flex items-center gap-3 transition-all duration-300 ${
                            groupButtons ? 'bg-slate-900/20 backdrop-blur-sm p-2 rounded-[2.5rem] border border-white/10 shadow-lg' : ''
                        }`}>
                            {showClaimButton && (
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
                                    className={`transition-all duration-300 font-bold py-3 px-6 rounded-full shadow-2xl flex items-center gap-2 text-base border-2 
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
                                            <ShoppingCart className="w-4 h-4" />
                                            MAKE OFFER
                                        </>
                                    ) : (
                                        <>
                                            <Zap className={`fill-current w-4 h-4 ${isAutoClaimEnabled ? 'animate-pulse' : ''}`} />
                                            {isAutoClaimEnabled ? 'AUTO-CLAIMING...' : 'CLAIM FOR 1 COIN'}
                                        </>
                                    )}
                                </button>
                            )}

                            {showAutoButton && (
                                <button 
                                    onClick={onToggleAutoClaim}
                                    className={`h-14 px-3 rounded-full flex flex-col items-center justify-center font-bold shadow-lg transition-all border-2
                                        ${isAutoClaimEnabled 
                                            ? 'bg-purple-600 text-white border-white animate-pulse shadow-purple-500/50' 
                                            : 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700'
                                        }`}
                                >
                                    <span className="text-[10px] leading-tight uppercase tracking-wider opacity-80">Auto</span>
                                    <span className="text-sm leading-tight">{isAutoClaimEnabled ? 'ON' : 'OFF'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Offer Modal */}
            <OfferModal
                isOpen={showOfferModal}
                onClose={() => setShowOfferModal(false)}
                onSubmit={(amount) => onMakeOffer(activeKey, amount)}
                maxBid={userBalance}
                minBid={2}
            />

            {/* Overlay Toast Notification */}
            {showAutoToast && (
                <div className="fixed inset-0 z-[2500] pointer-events-none flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300">
                    <div className="bg-purple-900/95 border border-purple-500/50 rounded-2xl p-6 max-w-sm shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4">
                        <div className="flex items-start gap-4">
                            <span className="text-purple-400 text-3xl flex-shrink-0 mt-1">ℹ️</span>
                            <div>
                                <h3 className="text-purple-100 text-lg font-bold uppercase tracking-wider mb-2">Auto-Claim is Active</h3>
                                <p className="text-purple-200 text-sm leading-relaxed">
                                    Automatically claiming unowned squares for 1 coin as you walk. Unless turned off, it runs until you enclose a territory or run out of coins.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
