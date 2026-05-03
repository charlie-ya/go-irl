import { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, Trophy, ChevronDown, Crown, BookOpen } from 'lucide-react';

interface ProfileStatsPanelProps {
    explorerName?: string;
    rank?: string;
    color?: string;
    claimedCount: number;
    capturedCount: number;
    coins: number;
    canAscend: boolean;
    onGetCoins: () => void;
    onEditProfile: () => void;
    onLeaderboard: () => void;
    onAscend: () => void;
    onShowRules: () => void;
    onLogout: () => void;
}

export function ProfileStatsPanel({ 
    explorerName = 'Explorer', 
    rank = 'Vassal', 
    color = '#475569', 
    claimedCount, 
    capturedCount, 
    coins, 
    canAscend,
    onGetCoins, 
    onEditProfile, 
    onLeaderboard, 
    onAscend,
    onShowRules,
    onLogout 
}: ProfileStatsPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative pointer-events-auto" ref={menuRef}>
            {/* Main Stats Card */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl overflow-hidden min-w-[130px]">
                <div className="p-2 flex flex-col gap-1.5 border-b border-slate-700/50">
                    
                    {/* Lines 1 & 2: Centered Name and Rank */}
                    <div className="text-center mb-0.5">
                        <div className="text-base font-black truncate drop-shadow-md" style={{ color: color }}>
                            {explorerName}
                        </div>
                        <div className="text-yellow-400 font-bold text-[10px] uppercase tracking-wider">
                            {rank}
                        </div>
                    </div>
                    
                    {/* Lines 3 & 4: Claimed and Captured Stats */}
                    <div className="flex flex-col gap-0.5 text-xs font-medium px-1">
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Claimed</span>
                            <strong className="text-white">{claimedCount}</strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-300">
                            <span>Captured</span>
                            <strong className="text-white">{capturedCount}</strong>
                        </div>
                    </div>

                    {/* Lines 5 & 6: Coins and Get More */}
                    <div 
                        className="flex flex-col gap-1.5 mt-1.5 pt-2 border-t border-slate-700/50 cursor-pointer group active:scale-95 touch-manipulation px-1 pb-0.5"
                        onClick={onGetCoins}
                    >
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-300 font-medium">Coins</span>
                            <span className="text-yellow-400 font-bold">🪙 {coins}</span>
                        </div>
                        <div className="text-center text-yellow-500 text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 group-hover:bg-yellow-500/20 px-1.5 py-1 rounded-lg transition-colors">
                            Get More
                        </div>
                    </div>
                </div>

                {/* Toggle Dropdown */}
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex justify-center items-center py-1.5 bg-slate-800/80 hover:bg-slate-700/80 transition-colors active:bg-slate-700"
                >
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-[calc(100%+6px)] right-0 min-w-[170px] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl py-1.5 flex flex-col z-[2100] animate-in slide-in-from-top-2 fade-in">
                    
                    {canAscend && (
                        <button onClick={() => { setIsOpen(false); onAscend(); }} className="flex items-center gap-2 px-3 py-2 text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors text-left w-full group font-bold">
                            <Crown className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm">Ascend in Rank</span>
                        </button>
                    )}
                    
                    <button onClick={() => { setIsOpen(false); onEditProfile(); }} className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left w-full group">
                        <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        <span className="text-sm font-medium">Edit Profile</span>
                    </button>
                    
                    <button onClick={() => { setIsOpen(false); onLeaderboard(); }} className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left w-full group">
                        <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform text-yellow-500/80 group-hover:text-yellow-400" />
                        <span className="text-sm font-medium">Leaderboard</span>
                    </button>
                    
                    <button onClick={() => { setIsOpen(false); onShowRules(); }} className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left w-full group">
                        <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform text-blue-400/80 group-hover:text-blue-300" />
                        <span className="text-sm font-medium">The Rules</span>
                    </button>
                    
                    <div className="h-px bg-slate-700/50 my-1 mx-2"></div>
                    
                    <button onClick={() => { setIsOpen(false); onLogout(); }} className="flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors text-left w-full group">
                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
}
