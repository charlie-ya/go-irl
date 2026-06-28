import { useState, useEffect } from 'react';

interface NestOnboardingPromptProps {
    tilesCount: number;
    hasNest: boolean;
    onStartPlacement: () => void;
}

export function NestOnboardingPrompt({ tilesCount, hasNest, onStartPlacement }: NestOnboardingPromptProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (tilesCount >= 5 && !hasNest) {
            const hasSeen = localStorage.getItem('nest_onboarding_seen');
            if (!hasSeen) {
                setIsVisible(true);
            }
        } else {
            setIsVisible(false);
        }
    }, [tilesCount, hasNest]);

    const handleDismiss = () => {
        localStorage.setItem('nest_onboarding_seen', 'true');
        setIsVisible(false);
    };

    const handleStart = () => {
        localStorage.setItem('nest_onboarding_seen', 'true');
        setIsVisible(false);
        onStartPlacement();
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-32 left-4 right-4 z-[2500] pointer-events-none flex justify-center animate-in slide-in-from-bottom-4">
            <div className="bg-amber-900/90 border border-amber-500/50 rounded-2xl p-5 shadow-2xl backdrop-blur-md pointer-events-auto max-w-sm w-full relative">
                <button onClick={handleDismiss} className="absolute top-3 right-3 text-amber-500/80 hover:text-amber-400 p-1">
                    ✕
                </button>
                <div className="flex items-start gap-4">
                    <img src="/assets/nests/nest_level1.png" alt="Nest" className="w-10 h-10 mt-1 object-contain" />
                    <div className="flex-1">
                        <h3 className="text-amber-100 font-bold text-lg mb-1">Make a Nest!</h3>
                        <p className="text-amber-200/90 text-sm leading-relaxed mb-4">
                            Your personal home base on the map. Visitors sign your guestbook to earn coins. Upgrade to earn coins yourself!
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleStart}
                                className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-amber-950 font-bold text-sm py-2 px-4 rounded-xl shadow-lg transition-transform active:scale-95"
                            >
                                <img src="/assets/nests/nest_level1.png" alt="" className="w-4 h-4 inline-block mr-1 -mt-0.5" /> Make your Nest here
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="w-full bg-amber-950/50 text-amber-400/80 hover:text-amber-300 hover:bg-amber-900/50 text-sm font-semibold py-2 px-4 rounded-xl border border-amber-500/30 transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
