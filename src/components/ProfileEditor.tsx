import { useState } from 'react';
import { X, Users } from 'lucide-react';
import { OFFICIAL_BIRDS, OFFICIAL_FLOWERS } from '../lib/constants';
import { ReferralPanel } from './ReferralPanel';

interface ProfileEditorProps {
    currentName: string;
    currentFlower?: string;
    currentBird?: string;
    playerId: string;
    onSave: (explorerName: string, officialFlower: string, officialBird: string) => void;
    onClose: () => void;
}

export function ProfileEditor({ currentName, currentFlower, currentBird, playerId, onSave, onClose }: ProfileEditorProps) {
    const [explorerName, setExplorerName] = useState(currentName);
    const [flower, setFlower] = useState(currentFlower || OFFICIAL_FLOWERS[0]);
    const [bird, setBird] = useState(currentBird || OFFICIAL_BIRDS[0]);
    const [error, setError] = useState('');
    const [showReferrals, setShowReferrals] = useState(false);

    const validateName = (name: string): boolean => {
        if (name.length < 3) {
            setError('Name must be at least 3 characters');
            return false;
        }
        if (name.length > 20) {
            setError('Name must be 20 characters or less');
            return false;
        }
        if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
            setError('Name can only contain letters, numbers, and spaces');
            return false;
        }
        setError('');
        return true;
    };

    const handleSave = () => {
        if (!validateName(explorerName)) return;

        // Check if anything changed
        if (explorerName === currentName &&
            flower === currentFlower &&
            bird === currentBird) {
            onClose();
            return;
        }

        onSave(explorerName, flower, bird);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[3000] flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-300" />
                    </button>
                </div>

                {/* Explorer Name */}
                <div className="space-y-2">
                    <label className="text-slate-300 font-semibold">Explorer Name</label>
                    <input
                        type="text"
                        value={explorerName}
                        onChange={(e) => {
                            setExplorerName(e.target.value);
                            setError('');
                        }}
                        placeholder="Enter explorer name"
                        maxLength={20}
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                    <div className="flex justify-between text-sm">
                        {error ? (
                            <span className="text-red-400">{error}</span>
                        ) : (
                            <span className="text-slate-400">3-20 characters</span>
                        )}
                        <span className="text-slate-400">{explorerName.length}/20</span>
                    </div>
                </div>

                {/* Official Flower */}
                <div className="space-y-2">
                    <label className="text-slate-300 font-semibold">Official Flower</label>
                    <select
                        value={flower}
                        onChange={(e) => setFlower(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                        {OFFICIAL_FLOWERS.map(f => (
                            <option key={f} value={f}>{f}</option>
                        ))}
                    </select>
                </div>

                {/* Official Bird */}
                <div className="space-y-2">
                    <label className="text-slate-300 font-semibold">Official Bird</label>
                    <select
                        value={bird}
                        onChange={(e) => setBird(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none appearance-none"
                    >
                        {OFFICIAL_BIRDS.map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>

                {/* Preview */}
                <div className="bg-slate-700 rounded-lg p-4 space-y-2 border border-slate-600">
                    <p className="text-slate-300 text-sm text-center">Protocol Preview:</p>
                    <div className="prose prose-invert text-sm text-center italic text-slate-300">
                        "The <span className="text-yellow-400 not-italic">{flower}</span> blooms in <span className="text-white not-italic font-bold">{explorerName}</span>'s land,
                        while the <span className="text-blue-400 not-italic">{bird}</span> sings."
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-6 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={explorerName.length < 3}
                        className="flex-1 py-3 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save Changes
                    </button>
                </div>

                {/* Invite Friends */}
                <div className="border-t border-slate-600 pt-4">
                    <button
                        onClick={() => setShowReferrals(true)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        <Users className="w-5 h-5" />
                        Invite Friends — Earn Coins
                    </button>
                </div>
            </div>

            {/* Referral Panel */}
            <ReferralPanel
                isOpen={showReferrals}
                onClose={() => setShowReferrals(false)}
                playerId={playerId}
            />
        </div>
    );
}
