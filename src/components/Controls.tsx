import { MapPin, Zap, Check, ShoppingCart, Shield } from 'lucide-react';
import { useState } from 'react';
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
    onClaim: (key: string) => Promise<number>;
    onMakeOffer: (key: string, amount: number) => void;
    userBalance: number;
    onGetCoins: () => void;

    // Ceremony Props
    onAffirm: (key: string) => void;
    onCompleteCeremony: (key: string) => void;
    activeCeremony: { id: string; affirmations: string[]; ownerId: string } | null;

    myId: string;
    myColor: string;
    claims: Record<string, { ownerId: string; color: string; capturedBy?: string }>;
    myOutgoingOffers: Offer[];
}

export function Controls({
    lat, lng, locationLoading,
    onClaim, onMakeOffer, userBalance, onGetCoins,
    onAffirm, onCompleteCeremony, activeCeremony,
    myId, myColor, claims, myOutgoingOffers
}: ControlsProps) {
    const currentKey = locationLoading ? '...' : getGridKey(lat, lng);
    const tile = claims[currentKey];
    const [showOfferModal, setShowOfferModal] = useState(false);

    const isOwnedByMe = tile && tile.ownerId === myId;
    const isOwnedByOther = tile && tile.ownerId !== myId;
    const isCapturedByOther = tile?.capturedBy && tile.capturedBy !== myId;
    const myPendingOffer = myOutgoingOffers.find(o => o.tileKey === currentKey);

    // Check if there is an active ceremony here
    const ceremonyHere = activeCeremony && activeCeremony.id === currentKey ? activeCeremony : null;

    return (
        <div className="absolute bottom-44 left-0 right-0 px-4 z-[1000] flex flex-col items-center gap-4">

            {/* --- OWNER VIEW --- */}
            {isOwnedByMe && (
                <div className="flex flex-col gap-2 items-center bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-xl scale-90 origin-bottom">
                    {!ceremonyHere ? (
                        <div className="flex items-center gap-3 bg-slate-800/80 px-6 py-3 rounded-full border border-white/10 shadow-lg backdrop-blur-sm">
                            <Check className="w-5 h-5 text-green-400" />
                            <div className="font-black text-white uppercase tracking-wider text-base">
                                Claimed!
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-yellow-400 text-[10px] font-mono uppercase tracking-widest">
                                • Ceremony •
                            </div>
                            <div className="text-xl font-black text-white">
                                {ceremonyHere.affirmations.length} <span className="text-xs font-normal text-slate-400">affirmations</span>
                            </div>
                            <button
                                onClick={() => onCompleteCeremony(currentKey)}
                                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 active:scale-95 touch-manipulation text-white text-[10px] px-4 py-2 rounded-full shadow-lg border border-yellow-300 font-bold transition-transform min-h-[36px]"
                            >
                                CLAIM PROMOTION
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
                        onClick={() => onAffirm(currentKey)}
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
                                onClaim(currentKey);
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
                        onSubmit={(amount) => onMakeOffer(currentKey, amount)}
                        maxBid={userBalance}
                        minBid={2}
                    />
                </>
            )}
        </div>
    );
}
