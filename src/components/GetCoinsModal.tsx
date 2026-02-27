import { X, Map, Users, ShoppingCart } from 'lucide-react';
import { isIAPAvailable } from '../lib/iapService';

interface GetCoinsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenReferral: () => void;
    onOpenCoinShop: () => void;
}

export function GetCoinsModal({ isOpen, onClose, onOpenReferral, onOpenCoinShop }: GetCoinsModalProps) {
    if (!isOpen) return null;

    const showIAP = isIAPAvailable();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[3000] flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">🪙 Get Coins</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-300" />
                    </button>
                </div>

                <p className="text-slate-300 text-sm">
                    Coins are used to claim new squares. Here's how to earn more:
                </p>

                {/* Option 1: Capture Territory */}
                <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Map className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <div className="text-white font-semibold">Capture Territory</div>
                            <p className="text-slate-400 text-sm mt-1">
                                Surround an area with claimed squares to capture it.
                                Earn <span className="text-yellow-400 font-medium">ΔX + ΔY bonus coins</span> based on the size!
                            </p>
                            <div className="text-emerald-400 text-xs font-medium mt-2">✨ FREE — Just explore!</div>
                        </div>
                    </div>
                </div>

                {/* Option 2: Invite Friends */}
                <button
                    onClick={() => { onClose(); onOpenReferral(); }}
                    className="w-full bg-slate-700/50 hover:bg-slate-600/50 rounded-xl p-4 border border-slate-600 transition-all active:scale-[0.98] text-left"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-white font-semibold">Invite Friends</div>
                            <p className="text-slate-400 text-sm mt-1">
                                Share your friend code and earn up to
                                <span className="text-yellow-400 font-medium"> 85 coins per friend</span> as they play.
                            </p>
                            <div className="text-emerald-400 text-xs font-medium mt-2">✨ FREE — Invite friends →</div>
                        </div>
                    </div>
                </button>

                {/* Option 3: Buy Coins (native only) */}
                {showIAP ? (
                    <button
                        onClick={() => { onClose(); onOpenCoinShop(); }}
                        className="w-full bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 rounded-xl p-4 border border-emerald-500/30 transition-all active:scale-[0.98] text-left"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-white font-semibold">Buy Coin Packs</div>
                                <p className="text-slate-400 text-sm mt-1">
                                    Instantly add coins to your balance. Packs start from just a few bucks.
                                </p>
                                <div className="text-emerald-400 text-xs font-medium mt-2">💳 Instant delivery →</div>
                            </div>
                        </div>
                    </button>
                ) : (
                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-600/50 flex items-center justify-center shrink-0 mt-0.5">
                                <ShoppingCart className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                                <div className="text-slate-400 font-semibold">Buy Coin Packs</div>
                                <p className="text-slate-500 text-sm mt-1">
                                    Available in the mobile app (Android & iOS).
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
