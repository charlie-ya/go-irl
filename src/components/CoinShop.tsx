import { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';
import { COIN_PACKS, purchasePack, getStorePrice, isIAPAvailable, type CoinPack } from '../lib/iapService';

interface CoinShopProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CoinShop({ isOpen, onClose }: CoinShopProps) {
    // true on iOS/Android native, false on web
    const isNative = isIAPAvailable();

    // Attempt to read localised prices from the native store catalog.
    // Prices arrive asynchronously after CdvPurchase finishes loading.
    const [storePrices, setStorePrices] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!isOpen || !isNative) return;
        const attempt = () => {
            const prices: Record<string, string> = {};
            let anyFound = false;
            COIN_PACKS.forEach(p => {
                const price = getStorePrice(p.productId);
                if (price) { prices[p.productId] = price; anyFound = true; }
            });
            if (anyFound) setStorePrices(prices);
        };
        attempt();
        const t1 = setTimeout(attempt, 2000);
        const t2 = setTimeout(attempt, 5000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [isOpen, isNative]);

    if (!isOpen) return null;

    const handlePurchase = async (pack: CoinPack) => {
        if (!isNative) return; // no-op on web; button is disabled
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

                {/* Web-only callout */}
                {!isNative && (
                    <div className="flex items-start gap-3 bg-slate-700/60 border border-slate-600 rounded-xl px-4 py-3">
                        <Smartphone className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="text-slate-300 text-sm leading-snug">
                            Coin purchases are available in the{' '}
                            <strong className="text-white">iOS and Android apps</strong>.
                            Download the app to buy coins.
                        </p>
                    </div>
                )}

                {/* Coin Packs */}
                <div className="space-y-3">
                    {COIN_PACKS.map((pack) => (
                        <button
                            key={pack.productId}
                            onClick={() => handlePurchase(pack)}
                            disabled={!isNative}
                            className={`w-full relative rounded-xl p-4 flex items-center justify-between border transition-all
                                ${isNative
                                    ? 'bg-slate-700/80 hover:bg-slate-600/80 border-slate-600 active:scale-[0.98]'
                                    : 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed'
                                }`}
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

                            {/* Right: Price or greyed-out label */}
                            <div className={`font-bold px-4 py-2 rounded-lg text-sm
                                ${isNative
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                                    : 'bg-slate-600 text-slate-400'
                                }`}>
                                {isNative
                                    ? (storePrices[pack.productId] ?? 'BUY')
                                    : 'App Only'}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="text-center text-slate-400 text-xs pt-2">
                    {isNative
                        ? '🪙 Coins never expire • Instant delivery'
                        : '📱 Download the app to purchase coins'}
                </div>
            </div>
        </div>
    );
}

