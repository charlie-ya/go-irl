import { BellRing, X } from 'lucide-react';

interface NotificationOptInPromptProps {
    isOpen: boolean;
    onAccept: () => void;
    onDismiss: () => void;
}

export function NotificationOptInPrompt({ isOpen, onAccept, onDismiss }: NotificationOptInPromptProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-emerald-500/30 overflow-hidden animate-in zoom-in-95">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 flex flex-col items-center text-center relative">
                    <button 
                        onClick={onDismiss}
                        className="absolute right-3 top-3 text-white/70 hover:text-white transition-colors p-1"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="bg-white/20 p-3 rounded-full mb-4 shadow-inner">
                        <BellRing className="w-8 h-8 text-white drop-shadow-md pb-0.5" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1 shadow-black/20 text-shadow">
                        Don't lose your square!
                    </h2>
                </div>
                
                <div className="p-6 space-y-4">
                    <p className="text-slate-300 text-sm text-center">
                        Turn on notifications to know when someone makes an offer on your territory.
                    </p>
                    <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-3">
                        <p className="text-amber-200/90 text-xs text-center font-medium">
                            ⚠️ Unanswered offers expire in 5 days, and you forfeit the square for half price!
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        <button
                            onClick={onAccept}
                            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold shadow-lg transition-all active:scale-[0.98]"
                        >
                            Enable Notifications
                        </button>
                        <button
                            onClick={onDismiss}
                            className="w-full py-3 px-4 rounded-xl bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 font-medium transition-colors text-sm"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
