import { X } from 'lucide-react';
import { useState } from 'react';

interface OfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (amount: number) => void;
    maxBid: number; // user's coin balance
    minBid?: number; // default 2
}

export function OfferModal({ isOpen, onClose, onSubmit, maxBid, minBid = 2 }: OfferModalProps) {
    const [rawValue, setRawValue] = useState(String(minBid));
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const parsedAmount = parseInt(rawValue, 10);
    const isValid = !isNaN(parsedAmount) && parsedAmount >= minBid && parsedAmount <= maxBid;

    const handleSubmit = () => {
        setError('');
        if (isNaN(parsedAmount) || parsedAmount < minBid) {
            setError(`Minimum bid is ${minBid} coins`);
            return;
        }
        if (parsedAmount > maxBid) {
            setError(`You only have ${maxBid} coins`);
            return;
        }
        onSubmit(parsedAmount);
        onClose();
        setRawValue(String(minBid));
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-white/10 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Make an Offer</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm text-slate-300 mb-2 block">
                            Your Balance: <span className="font-bold text-white">{maxBid} 🪙</span>
                        </label>

                        <div className="relative">
                            <input
                                type="number"
                                min={minBid}
                                max={maxBid}
                                value={rawValue}
                                onChange={(e) => { setRawValue(e.target.value); setError(''); }}
                                className="w-full bg-slate-900 text-white text-2xl font-bold px-4 py-3 rounded-lg border border-white/10 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                placeholder={minBid.toString()}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">🪙</span>
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm mt-2">{error}</p>
                        )}
                    </div>

                    <div className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg">
                        💡 The owner will see your offer and can accept or decline it.
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 pt-0">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all shadow-lg"
                    >
                        Submit Offer
                    </button>
                </div>
            </div>
        </div>
    );
}
