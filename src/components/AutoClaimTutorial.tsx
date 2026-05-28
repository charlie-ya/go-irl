

interface AutoClaimTutorialProps {
    onClose: () => void;
}

export function AutoClaimTutorial({ onClose }: AutoClaimTutorialProps) {
    return (
        <div className="fixed inset-0 bg-black/80 z-[3000] flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full border-2 border-purple-500 shadow-2xl shadow-purple-500/20 text-center animate-in zoom-in duration-300">
                <div className="text-4xl mb-4">🚀</div>
                <h2 className="text-2xl font-black text-white mb-2">Auto-Claim Unlocked!</h2>
                <p className="text-slate-300 text-sm mb-6">
                    You've made your first capture! You can now use the new <span className="font-bold text-purple-400">AUTO</span> button next to Claim. 
                    <br/><br/>
                    When active, the app will automatically claim unowned squares for 1 coin as you walk through them.
                </p>
                <button 
                    onClick={onClose} 
                    className="w-full bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all text-white font-bold py-3 rounded-full"
                >
                    Awesome!
                </button>
            </div>
        </div>
    );
}
