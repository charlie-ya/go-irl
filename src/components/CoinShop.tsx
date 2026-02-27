import { X } from 'lucide-react';
import { COIN_PACKS, purchasePack, type CoinPack } from '../lib/iapService';

interface CoinShopProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CoinShop({ isOpen, onClose }: CoinShopProps) {
    if (!isOpen) return null;

    const handlePurchase = async (pack: CoinPack) => {
        await purchasePack(pack.productId);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[3100] flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">💰 Coin Shop</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-300" />
                    </button>
                </div>

                {/* Coin Packs */}
                <div className="space-y-3">
                    {COIN_PACKS.map((pack) => (
                        <button
                            key={pack.productId}
                            onClick={() => handlePurchase(pack)}
                            className="w-full relative bg-slate-700/80 hover:bg-slate-600/80 rounded-xl p-4 flex items-center justify-between border border-slate-600 transition-all active:scale-[0.98]"
                        >
                            {/* Badge */}
                            {pack.badge && (
                                <div className={`absolute -top-2 right-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${pack.badge === 'Best Value'
                                        ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                                    }`}>
                                    {pack.badge}
                                </div>
                            )}

                            {/* Left: Info */}
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">🪙</div>
                                <div className="text-left">
                                    <div className="text-white font-bold text-lg">
                                        {pack.coins.toLocaleString()}
                                        {pack.bonusLabel && (
                                            <span className="text-yellow-400 text-sm ml-1">
                                                {pack.bonusLabel}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-slate-400 text-sm">{pack.label}</div>
                                </div>
                            </div>

                            {/* Right: Price placeholder */}
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-4 py-2 rounded-lg text-sm">
                                BUY
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="text-center text-slate-400 text-xs pt-2">
                    🪙 Coins never expire • Instant delivery
                </div>
            </div>
        </div>
    );
}
