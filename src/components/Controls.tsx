import { MapPin, Zap, Check, ShoppingCart, ChevronRight, ArrowUpCircle, Shield } from 'lucide-react';
import { useState } from 'react';
import { getGridKey } from '../lib/gridSystem';

interface ControlsProps {
    lat: number;
    lng: number;
    locationLoading: boolean;
    onClaim: (key: string) => void;
    onBuy: (key: string) => void;

    // Ceremony Props
    onStartCeremony: (key: string) => void;
    onAffirm: (key: string) => void;
    onCompleteCeremony: (key: string) => void;
    activeCeremony: { id: string; affirmations: string[]; ownerId: string } | null;

    myId: string;
    myColor: string;
    claims: Record<string, { ownerId: string; color: string }>;
}

export function Controls({
    lat, lng, locationLoading,
    onClaim, onBuy,
    onStartCeremony, onAffirm, onCompleteCeremony, activeCeremony,
    myId, myColor, claims
}: ControlsProps) {
    const currentKey = locationLoading ? '...' : getGridKey(lat, lng);
    const tile = claims[currentKey];
    const [showMenu, setShowMenu] = useState(false);

    const isOwnedByMe = tile && tile.ownerId === myId;
    const isOwnedByOther = tile && tile.ownerId !== myId;

    // Check if there is an active ceremony here
    const ceremonyHere = activeCeremony && activeCeremony.id === currentKey ? activeCeremony : null;

    return (
        <div className="absolute bottom-28 left-0 right-0 px-4 z-[1000] flex flex-col items-center gap-4">

            {/* --- OWNER VIEW --- */}
            {isOwnedByMe && (
                <div className="flex flex-col gap-2 items-center bg-slate-900/90 p-3 rounded-xl border border-white/10 shadow-xl">
                    <div className="text-white font-bold text-sm flex items-center gap-2 hidden">
                        <Check className="w-4 h-4 text-green-400" />
                        You own this square!
                    </div>

                    {!ceremonyHere ? (
                        <div className="relative">
                            <div className="flex items-center gap-3 bg-slate-800/80 p-2 pr-2 rounded-full border border-white/10 shadow-lg backdrop-blur-sm">
                                <div className="pl-4 font-black text-white uppercase tracking-wider text-sm">
                                    Claimed!
                                </div>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-colors active:scale-95"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Menu Overlay */}
                            {showMenu && (
                                <div className="absolute bottom-full mb-3 right-0 left-0 bg-slate-800 rounded-xl border border-white/10 shadow-2xl p-2 flex flex-col gap-1 min-w-[200px] animate-in slide-in-from-bottom-2 fade-in">
                                    <button
                                        className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/5 rounded-lg transition-colors w-full text-left"
                                        onClick={() => onStartCeremony(currentKey)}
                                    >
                                        <ArrowUpCircle className="w-4 h-4 text-yellow-400" />
                                        <span className="font-bold text-sm">Raise Status</span>
                                    </button>
                                    <button
                                        className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/5 rounded-lg transition-colors w-full text-left"
                                        onClick={() => console.log("Fortify Stub")}
                                    >
                                        <Shield className="w-4 h-4 text-blue-400" />
                                        <span className="font-bold text-sm">Fortify</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-yellow-400 text-xs font-mono uppercase tracking-widest">
                                • Ceremony Active •
                            </div>
                            <div className="text-2xl font-black text-white">
                                {ceremonyHere.affirmations.length} <span className="text-sm font-normal text-slate-400">affirmations</span>
                            </div>
                            <button
                                onClick={() => onCompleteCeremony(currentKey)}
                                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 active:scale-95 touch-manipulation text-white text-xs px-6 py-3 rounded-full shadow-lg border border-yellow-300 font-bold transition-transform min-h-[44px]"
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
                    <div className="text-white font-bold text-center">
                        Help the owner rise in rank!
                    </div>
                    <button
                        onClick={() => onAffirm(currentKey)}
                        disabled={ceremonyHere.affirmations.includes(myId)}
                        className="bg-indigo-500 hover:bg-indigo-400 active:scale-95 touch-manipulation disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm px-8 py-3 rounded-full shadow-lg font-bold transition-all min-h-[44px]"
                    >
                        {ceremonyHere.affirmations.includes(myId) ? "Affirmed! 🫡" : "AFFIRM 🙌"}
                    </button>
                </div>
            )}


            <div className="bg-slate-900/80 backdrop-blur-md text-white p-3 rounded-lg shadow-lg flex items-center gap-3 border border-slate-700">
                <MapPin className="text-blue-400 w-5 h-5" />
                <div className="text-xs font-mono">
                    <div>LAT: {lat?.toFixed(4)}</div>
                    <div>LNG: {lng?.toFixed(4)}</div>
                </div>
            </div>

            {/* Standard Claim/Buy Button (Hidden if viewing ceremony details to avoid clutter? Or kept?) */}
            {/* Let's keep it but maybe smaller or secondary if ceremony logic is prioritized. */}
            {/* Actually, if I own it, I don't need the big CLAIMED button if I have the panel above. */}

            {!isOwnedByMe && (
                <button
                    onClick={() => {
                        if (isOwnedByOther) {
                            onBuy(currentKey);
                        } else {
                            onClaim(currentKey);
                        }
                    }}
                    disabled={locationLoading}
                    className={`transition-all duration-300 font-bold py-4 px-8 rounded-full shadow-2xl flex items-center gap-2 text-lg border-2 
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
                            BUY FOR $0.99
                        </>
                    ) : (
                        <>
                            <Zap className="fill-current w-5 h-5" />
                            CLAIM (1🪙)
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
