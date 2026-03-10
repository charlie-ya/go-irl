import { useState, useEffect } from 'react';

interface CaptureCelebrationProps {
    bonus: number;
    onDismiss: () => void;
    onShare: () => void;
}

export function CaptureCelebration({ bonus, onDismiss, onShare }: CaptureCelebrationProps) {
    const [phase, setPhase] = useState<'enter' | 'show'>('enter');
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        // Enter → Show
        const enterTimer = setTimeout(() => setPhase('show'), 50);
        return () => clearTimeout(enterTimer);
    }, []);

    const handleShare = async () => {
        setSharing(true);
        try {
            await onShare();
        } catch (e) {
            console.error('[CaptureCelebration] Share failed:', e);
        }
        // onShare handler in App.tsx will call onDismiss
    };

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-center justify-center"
            style={{ perspective: '600px' }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30" onClick={onDismiss} />

            <div
                className={`
                    relative flex flex-col items-center gap-4 px-8 py-6 rounded-2xl
                    bg-gradient-to-br from-amber-500/95 via-yellow-500/95 to-orange-500/95
                    border-2 border-yellow-300/50 shadow-2xl backdrop-blur-sm
                    transition-all duration-500 ease-out
                    ${phase === 'enter' ? 'opacity-0 scale-50' : ''}
                    ${phase === 'show' ? 'opacity-100 scale-100' : ''}
                `}
                style={{
                    boxShadow: '0 0 60px rgba(245, 158, 11, 0.5), 0 0 120px rgba(245, 158, 11, 0.2)',
                }}
            >
                <div className="text-4xl">🏰</div>
                <div className="text-white font-black text-xl uppercase tracking-wider text-center">
                    Territory Captured!
                </div>
                <div
                    className="flex items-center gap-2 bg-white/20 px-5 py-2 rounded-full"
                >
                    <span className="text-2xl">🪙</span>
                    <span className="text-white font-black text-2xl">
                        +{bonus}
                    </span>
                    <span className="text-white/80 text-sm font-semibold">coins</span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col items-center gap-2 mt-2 w-full">
                    <button
                        onClick={handleShare}
                        disabled={sharing}
                        className="w-full py-4 px-6 rounded-xl bg-white text-amber-700 font-black text-lg uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                    >
                        {sharing ? (
                            <span className="w-5 h-5 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>Share 🏛️</>
                        )}
                    </button>
                    <button
                        onClick={onDismiss}
                        className="py-2 text-white/60 text-xs font-medium hover:text-white/80 transition-colors"
                    >
                        Not this Time
                    </button>
                </div>
            </div>
        </div>
    );
}
