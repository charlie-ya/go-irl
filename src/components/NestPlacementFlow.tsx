import { useState, useEffect } from 'react';
import { MapPin, Shield, Star, Share } from 'lucide-react';

interface NestPlacementFlowProps {
    isOpen: boolean;
    onClose: () => void;
    hasNest: boolean;
    onCreateNest: () => Promise<void>;
    onShare: () => Promise<void>;
}

export function NestPlacementFlow({ isOpen, onClose, hasNest, onCreateNest, onShare }: NestPlacementFlowProps) {
    const [step, setStep] = useState(1);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [checkAccessible, setCheckAccessible] = useState(false);
    const [checkSafe, setCheckSafe] = useState(false);
    const [checkFun, setCheckFun] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setCheckAccessible(false);
            setCheckSafe(false);
            setCheckFun(false);
            setError(null);
            setIsCreating(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreate = async () => {
        setIsCreating(true);
        setError(null);
        try {
            await onCreateNest();
            setStep(6);
        } catch (e: any) {
            setError(e.message || "Failed to establish nest. You may need to wait 5 days between moves.");
            setIsCreating(false);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="flex flex-col items-center text-center">
                        <img src="/assets/nests/nest_level1.png" alt="Nest" className="w-16 h-16 mb-4 object-contain" />
                        <h2 className="text-2xl font-bold text-white mb-2">
                            {hasNest ? "Move your Nest here?" : "Make your Nest here?"}
                        </h2>
                        {hasNest && (
                            <p className="text-amber-400 text-sm font-semibold mb-6">
                                Warning: Your guestbook will start over empty.
                            </p>
                        )}
                        {!hasNest && <div className="mb-6"></div>}
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => setStep(2)}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg"
                            >
                                Continue
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full text-slate-400 hover:text-slate-300 py-2 font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">A Nest is Best when:</h2>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3">
                                <MapPin className="text-blue-400 w-6 h-6" />
                                <span className="text-slate-200 font-medium">It's accessible</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Shield className="text-green-400 w-6 h-6" />
                                <span className="text-slate-200 font-medium">It's safe</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Star className="text-amber-400 w-6 h-6" />
                                <span className="text-slate-200 font-medium">It's fun and attractive</span>
                            </li>
                        </ul>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={handleCreate}
                                disabled={isCreating}
                                className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-amber-950 font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
                            >
                                {isCreating ? "Placing Nest..." : "Choose this Spot"}
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={isCreating}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl"
                            >
                                Learn More
                            </button>
                            {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="flex flex-col">
                        <div className="flex justify-center mb-4"><MapPin className="text-blue-400 w-12 h-12" /></div>
                        <h2 className="text-2xl font-bold text-white mb-4 text-center">Accessible</h2>
                        <p className="text-slate-300 mb-8 text-center leading-relaxed">
                            The spot is public and people can visit freely during most hours of the day.
                        </p>
                        <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-xl border border-slate-600 mb-6 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={checkAccessible} 
                                onChange={(e) => setCheckAccessible(e.target.checked)}
                                className="w-6 h-6 rounded border-slate-500 text-blue-500 focus:ring-blue-500 bg-slate-700"
                            />
                            <span className="text-white font-medium">I confirm this spot is accessible</span>
                        </label>
                        <button
                            onClick={() => setStep(4)}
                            disabled={!checkAccessible}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:bg-slate-700"
                        >
                            Next
                        </button>
                    </div>
                );
            case 4:
                return (
                    <div className="flex flex-col">
                        <div className="flex justify-center mb-4"><Shield className="text-green-400 w-12 h-12" /></div>
                        <h2 className="text-2xl font-bold text-white mb-4 text-center">Safe</h2>
                        <p className="text-slate-300 mb-8 text-center leading-relaxed">
                            The spot is not in the middle of traffic, on a steep slope, or hazardous in any way.
                        </p>
                        <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-xl border border-slate-600 mb-6 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={checkSafe} 
                                onChange={(e) => setCheckSafe(e.target.checked)}
                                className="w-6 h-6 rounded border-slate-500 text-green-500 focus:ring-green-500 bg-slate-700"
                            />
                            <span className="text-white font-medium">I confirm this spot is safe</span>
                        </label>
                        <button
                            onClick={() => setStep(5)}
                            disabled={!checkSafe}
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:bg-slate-700"
                        >
                            Next
                        </button>
                    </div>
                );
            case 5:
                return (
                    <div className="flex flex-col">
                        <div className="flex justify-center mb-4"><Star className="text-amber-400 w-12 h-12" /></div>
                        <h2 className="text-2xl font-bold text-white mb-4 text-center">Fun & Attractive</h2>
                        <p className="text-slate-300 mb-8 text-center leading-relaxed">
                            More people will visit if your nest has a beautiful view, or a shady tree. Maybe there's coffee available!
                        </p>
                        <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-xl border border-slate-600 mb-6 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={checkFun} 
                                onChange={(e) => setCheckFun(e.target.checked)}
                                className="w-6 h-6 rounded border-slate-500 text-amber-500 focus:ring-amber-500 bg-slate-700"
                            />
                            <span className="text-white font-medium text-sm">I confirm this spot is fun and attractive</span>
                        </label>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={handleCreate}
                                disabled={!checkFun || isCreating}
                                className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-amber-950 font-bold py-3 rounded-xl shadow-lg disabled:opacity-50"
                            >
                                {isCreating ? "Placing Nest..." : "Choose this Spot"}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={isCreating}
                                className="w-full text-slate-400 hover:text-slate-300 py-2 font-medium"
                            >
                                Not now, still looking
                            </button>
                        </div>
                        {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
                    </div>
                );
            case 6:
                return (
                    <div className="flex flex-col items-center text-center py-4">
                        <div className="text-6xl mb-4 animate-bounce">🎉</div>
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 mb-3">
                            Nest {hasNest ? "Moved" : "Created"}!
                        </h2>
                        <p className="text-slate-300 mb-8 leading-relaxed">
                            Your home base is ready for visitors. Share it with your friends so they can come sign the guestbook!
                        </p>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={async () => {
                                    await onShare();
                                    onClose();
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform"
                            >
                                <Share className="w-5 h-5" /> Share Nest Map
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full text-slate-400 hover:text-slate-300 py-3 font-semibold"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm pointer-events-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
                {step !== 6 && !isCreating && (
                    <button 
                        onClick={onClose}
                        className="absolute top-3 right-3 p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors z-10"
                    >
                        ✕
                    </button>
                )}
                
                {/* Progress bar for Learn More steps */}
                {step >= 3 && step <= 5 && (
                    <div className="w-full h-1 bg-slate-800">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                            style={{ width: `${((step - 2) / 3) * 100}%` }}
                        />
                    </div>
                )}

                <div className="p-6 pt-10">
                    {renderStep()}
                </div>
            </div>
        </div>
    );
}
