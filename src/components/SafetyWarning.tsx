import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export function SafetyWarning() {
    const [acknowledged, setAcknowledged] = useState(false);

    useEffect(() => {
        // Show once per day (localStorage survives tab close; sessionStorage
        // can persist across SPA reloads in the same tab, causing the
        // warning to never reappear on web)
        const lastSeen = localStorage.getItem('safety_warning_seen');
        if (lastSeen) {
            const hoursAgo = (Date.now() - parseInt(lastSeen, 10)) / (1000 * 60 * 60);
            if (hoursAgo < 24) {
                setAcknowledged(true);
            }
        }
    }, []);

    const handleDismiss = () => {
        setAcknowledged(true);
        localStorage.setItem('safety_warning_seen', Date.now().toString());
    };

    if (acknowledged) return null;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="bg-amber-500/20 p-4 rounded-full">
                        <AlertTriangle className="w-12 h-12 text-amber-500" />
                    </div>

                    <h2 className="text-xl font-bold text-white">Safety Warning</h2>

                    <div className="text-slate-300 text-sm space-y-3">
                        <p>
                            <strong className="text-amber-400">DO NOT TRESPASS.</strong><br />
                            You do not need to enter private property to play. Capture "City Blocks" by walking around the public perimeter.
                        </p>
                        <p>
                            <strong className="text-amber-400">STAY ALERT.</strong><br />
                            Be aware of your surroundings at all times. Do not play while driving.
                        </p>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-lg transition-colors"
                    >
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
}
