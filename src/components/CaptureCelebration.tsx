import { useState, useEffect } from 'react';

interface CaptureCelebrationProps {
    bonus: number;
    onDismiss: () => void;
}

export function CaptureCelebration({ bonus, onDismiss }: CaptureCelebrationProps) {
    const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

    useEffect(() => {
        // Enter → Show
        const enterTimer = setTimeout(() => setPhase('show'), 50);
        // Show → Exit
        const exitTimer = setTimeout(() => setPhase('exit'), 2500);
        // Exit → Dismiss
        const dismissTimer = setTimeout(onDismiss, 3200);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(exitTimer);
            clearTimeout(dismissTimer);
        };
    }, [onDismiss]);

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-center justify-center pointer-events-none"
            style={{ perspective: '600px' }}
        >
            <div
                className={`
                    flex flex-col items-center gap-3 px-8 py-6 rounded-2xl
                    bg-gradient-to-br from-amber-500/95 via-yellow-500/95 to-orange-500/95
                    border-2 border-yellow-300/50 shadow-2xl backdrop-blur-sm
                    transition-all duration-500 ease-out
                    ${phase === 'enter' ? 'opacity-0 scale-50' : ''}
                    ${phase === 'show' ? 'opacity-100 scale-100' : ''}
                    ${phase === 'exit' ? 'opacity-0 scale-75 -translate-y-8' : ''}
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
            </div>
        </div>
    );
}
