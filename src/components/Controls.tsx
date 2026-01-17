import { MapPin, Zap, Check, ShoppingCart } from 'lucide-react';
import { getGridKey } from '../lib/gridSystem';

interface ControlsProps {
    lat: number;
    lng: number;
    locationLoading: boolean;
    onClaim: (key: string) => void;
    onBuy: (key: string) => void;
    myId: string;
    myColor: string;
    claims: Record<string, { ownerId: string; color: string }>;
}

export function Controls({ lat, lng, locationLoading, onClaim, onBuy, myId, myColor, claims }: ControlsProps) {
    const currentKey = locationLoading ? '...' : getGridKey(lat, lng);
    const tile = claims[currentKey];

    const isOwnedByMe = tile && tile.ownerId === myId;
    const isOwnedByOther = tile && tile.ownerId !== myId;

    return (
        <div className="absolute bottom-20 left-0 right-0 px-4 z-[1000] flex flex-col items-center gap-4">
            {isOwnedByMe && (
                <div className="flex animate-bounce bg-green-500/90 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm">
                    ✨ You own this square! Move to a new one!
                </div>
            )}

            {isOwnedByOther && (
                <div className="flex bg-indigo-500/90 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm">
                    Owned by another player
                </div>
            )}

            <div className="bg-slate-900/80 backdrop-blur-md text-white p-3 rounded-lg shadow-lg flex items-center gap-3 border border-slate-700">
                <MapPin className="text-blue-400 w-5 h-5" />
                <div className="text-xs font-mono">
                    <div>LAT: {lat?.toFixed(4)}</div>
                    <div>LNG: {lng?.toFixed(4)}</div>
                </div>
            </div>

            <button
                onClick={() => {
                    if (isOwnedByOther) {
                        onBuy(currentKey);
                    } else {
                        onClaim(currentKey);
                    }
                }}
                disabled={locationLoading || isOwnedByMe}
                className={`transition-all duration-300 font-bold py-4 px-8 rounded-full shadow-2xl flex items-center gap-2 text-lg border-2 
                    ${isOwnedByMe
                        ? 'bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed'
                        : isOwnedByOther
                            ? 'active:scale-95 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-white/20'
                            : 'active:scale-95 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-white/20'
                    }`}
                style={!isOwnedByMe ? {
                    boxShadow: `0 0 20px ${isOwnedByOther ? '#10b981' : myColor}40`
                } : undefined}
            >
                {isOwnedByMe ? (
                    <>
                        <Check className="w-5 h-5" />
                        CLAIMED
                    </>
                ) : isOwnedByOther ? (
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
        </div>
    );
}
