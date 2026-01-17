import { useState } from 'react';
import { ColorPicker } from './ColorPicker';
import { X, AlertTriangle } from 'lucide-react';

interface ProfileEditorProps {
    currentName: string;
    currentColor: string;
    onSave: (explorerName: string, color: string) => void;
    onClose: () => void;
}

export function ProfileEditor({ currentName, currentColor, onSave, onClose }: ProfileEditorProps) {
    const [explorerName, setExplorerName] = useState(currentName);
    const [color, setColor] = useState(currentColor);
    const [error, setError] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

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

        // Show confirmation if color changed (affects all territories)
        if (color !== currentColor) {
            setShowConfirm(true);
        } else {
            onSave(explorerName, color);
        }
    };

    const handleConfirm = () => {
        onSave(explorerName, color);
        setShowConfirm(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[3000] flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
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

                {!showConfirm ? (
                    <>
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

                        {/* Color Picker */}
                        <div className="space-y-2">
                            <label className="text-slate-300 font-semibold">Territory Color</label>
                            <ColorPicker selectedColor={color} onColorChange={setColor} />
                        </div>

                        {/* Preview */}
                        <div className="bg-slate-700 rounded-lg p-4 space-y-2">
                            <p className="text-slate-300 text-sm text-center">Preview:</p>
                            <div className="flex items-center justify-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-lg"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-white font-semibold text-lg">{explorerName || 'Your Name'}</span>
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
                    </>
                ) : (
                    /* Confirmation Dialog */
                    <div className="space-y-6">
                        <div className="w-16 h-16 mx-auto bg-yellow-500 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-bold text-white">Update All Territory?</h3>
                            <p className="text-slate-300">
                                Changing your color will update all squares and territories you own. This may take a moment.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-3 px-6 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-1 py-3 px-6 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
                            >
                                Confirm Update
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
