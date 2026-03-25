import { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, Trophy, ChevronDown, Crown } from 'lucide-react';

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
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 shadow-2xl rounded-2xl overflow-hidden min-w-[160px]">
                <div className="p-3 flex flex-col gap-2 border-b border-slate-700/50">
                    
                    {/* Lines 1 & 2: Centered Name and Rank */}
                    <div className="text-center mb-1">
                        <div className="text-lg font-black truncate drop-shadow-md" style={{ color: color }}>
                            {explorerName}
                        </div>
                        <div className="text-yellow-400 font-bold text-xs uppercase tracking-wider">
                            {rank}
                        </div>
                    </div>
                    
                    {/* Lines 3 & 4: Claimed and Captured Stats */}
                    <div className="flex flex-col gap-1 text-sm font-medium px-1">
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
                        className="flex flex-col gap-2 mt-2 pt-3 border-t border-slate-700/50 cursor-pointer group active:scale-95 touch-manipulation px-1 pb-1"
                        onClick={onGetCoins}
                    >
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-300 font-medium">Coins</span>
                            <span className="text-yellow-400 font-bold">🪙 {coins}</span>
                        </div>
                        <div className="text-center text-yellow-500 text-xs font-bold uppercase tracking-wider bg-yellow-500/10 group-hover:bg-yellow-500/20 px-2 py-1.5 rounded-lg transition-colors">
                            Get More
                        </div>
                    </div>
                </div>

                {/* Toggle Dropdown */}
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex justify-center items-center py-2 bg-slate-800/80 hover:bg-slate-700/80 transition-colors active:bg-slate-700"
                >
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 min-w-[200px] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl py-2 flex flex-col z-[2100] animate-in slide-in-from-top-2 fade-in">
                    
                    {canAscend && (
                        <button onClick={() => { setIsOpen(false); onAscend(); }} className="flex items-center gap-3 px-4 py-3 text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors text-left w-full group font-bold">
                            <Crown className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm">Ascend in Rank</span>
                        </button>
                    )}
                    
                    <button onClick={() => { setIsOpen(false); onEditProfile(); }} className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left w-full group">
                        <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        <span className="text-sm font-medium">Edit Profile</span>
                    </button>
                    
                    <button onClick={() => { setIsOpen(false); onLeaderboard(); }} className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left w-full group">
                        <Trophy className="w-4 h-4 group-hover:scale-110 transition-transform text-yellow-500/80 group-hover:text-yellow-400" />
                        <span className="text-sm font-medium">Leaderboard</span>
                    </button>
                    
                    <div className="h-px bg-slate-700/50 my-1 mx-2"></div>
                    
                    <button onClick={() => { setIsOpen(false); onLogout(); }} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors text-left w-full group">
                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>
            )}
        </div>
    );
}
