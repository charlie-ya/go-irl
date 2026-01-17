import { useState } from 'react';
import { ColorPicker } from './ColorPicker';
import { MapPin, User } from 'lucide-react';

interface OnboardingProps {
    onComplete: (explorerName: string, color: string) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(1);
    const [explorerName, setExplorerName] = useState('');
    const [color, setColor] = useState('#FF6B6B');
    const [error, setError] = useState('');

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

    const handleNext = () => {
        if (step === 1) {
            setStep(2);
        } else if (step === 2) {
            if (validateName(explorerName)) {
                setStep(3);
            }
        } else if (step === 3) {
            onComplete(explorerName, color);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
                {/* Progress Indicator */}
                <div className="flex gap-2 mb-6">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`h-2 flex-1 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-slate-600'
                                }`}
                        />
                    ))}
                </div>

                {/* Step 1: Welcome */}
                {step === 1 && (
                    <div className="space-y-6 text-center">
                        <div className="w-20 h-20 mx-auto bg-blue-500 rounded-full flex items-center justify-center">
                            <MapPin className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Welcome to goIRL!</h1>
                        <p className="text-slate-300 text-lg leading-relaxed">
                            Claim real-world territory by walking around your city. Enclose areas to capture them, just like in the game of GO!
                        </p>
                        <ul className="text-left text-slate-300 space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>Walk to squares and claim them with coins</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>Surround areas to capture territory</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>Your identity stays private - only your explorer name shows</span>
                            </li>
                        </ul>
                    </div>
                )}

                {/* Step 2: Choose Name */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 mx-auto bg-purple-500 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white text-center">Choose Your Explorer Name</h2>
                        <p className="text-slate-300 text-center">
                            This name will be visible to other players on the map. Choose wisely!
                        </p>
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={explorerName}
                                onChange={(e) => {
                                    setExplorerName(e.target.value);
                                    setError('');
                                }}
                                placeholder="Enter explorer name"
                                maxLength={20}
                                className="w-full px-4 py-3 bg-slate-700 text-white text-lg rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                                autoFocus
                            />
                            <div className="flex justify-between text-sm">
                                {error ? (
                                    <span className="text-red-400">{error}</span>
                                ) : (
                                    <span className="text-slate-400">3-20 characters, letters and numbers only</span>
                                )}
                                <span className="text-slate-400">{explorerName.length}/20</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Choose Color */}
                {step === 3 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white text-center">Choose Your Color</h2>
                        <p className="text-slate-300 text-center">
                            Your territory will be displayed in this color
                        </p>
                        <ColorPicker selectedColor={color} onColorChange={setColor} />

                        {/* Preview */}
                        <div className="bg-slate-700 rounded-lg p-4 space-y-2">
                            <p className="text-slate-300 text-sm text-center">Preview:</p>
                            <div className="flex items-center justify-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-lg"
                                    style={{ backgroundColor: color }}
                                />
                                <span className="text-white font-semibold text-lg">{explorerName}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-4">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="flex-1 py-3 px-6 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-semibold"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={step === 2 && explorerName.length < 3}
                        className="flex-1 py-3 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {step === 3 ? 'Start Exploring!' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
}
