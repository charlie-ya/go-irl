import { useState } from 'react';
import { X, Users } from 'lucide-react';
import { ReferralPanel } from './ReferralPanel';
import { ColorPicker } from './ColorPicker';

interface ProfileEditorProps {
    currentName: string;
    currentColor: string;
    playerId: string;
    onSave: (explorerName: string, color: string) => void;
    onClose: () => void;
}

export function ProfileEditor({ currentName, currentColor, playerId, onSave, onClose }: ProfileEditorProps) {
    const [explorerName, setExplorerName] = useState(currentName);
    const [color, setColor] = useState(currentColor || '#FF1744');
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
        if (explorerName === currentName && color === currentColor) {
            onClose();
            return;
        }

        onSave(explorerName, color);
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

                {/* Tile Color Picker */}
                <div className="space-y-4">
                    <label className="text-slate-300 font-semibold block mb-2">Tile Map Color</label>
                    <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600/50">
                        <ColorPicker 
                            selectedColor={color} 
                            onColorChange={(c) => setColor(c)} 
                        />
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

                {/* Account Deletion */}
                <div className="border-t border-slate-600 pt-4 mt-2">
                    <button
                        onClick={() => {
                            if (window.confirm("WARNING: Deleting your account is permanent. All associated territories will fade to Moribund. Are you completely sure you wish to delete your account?")) {
                                import('../lib/firebase').then(({ auth }) => {
                                    const user = auth.currentUser;
                                    if (user) {
                                        user.delete().then(() => {
                                            alert("Account successfully deleted.");
                                            window.location.reload();
                                        }).catch(e => {
                                            if (e.code === 'auth/requires-recent-login') {
                                                alert("Please sign out and sign back in to verify your identity before deleting your account.");
                                            } else {
                                                alert("Failed to delete account: " + e.message);
                                            }
                                        });
                                    }
                                });
                            }
                        }}
                        className="w-full py-3 px-4 bg-transparent border border-red-500/50 hover:bg-red-500/20 text-red-500 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                        Delete Account Permanently
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
