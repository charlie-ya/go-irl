import { useState, useEffect } from 'react';
import { ColorPicker } from './ColorPicker';
import { MapPin, User, ChevronDown } from 'lucide-react';
import { getReferralCodeFromURL } from '../lib/referralService';

interface OnboardingProps {
    onComplete: (explorerName: string, color: string, referralCode?: string) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(1);
    const [explorerName, setExplorerName] = useState('');
    const [color, setColor] = useState('#FF6B6B');
    const [error, setError] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [showReferralInput, setShowReferralInput] = useState(false);
    const [agreedLegal, setAgreedLegal] = useState(false);

    // Pre-fill referral code from URL on mount
    useEffect(() => {
        const urlCode = getReferralCodeFromURL();
        if (urlCode) {
            setReferralCode(urlCode);
            setShowReferralInput(true);
        }
    }, []);

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
            onComplete(explorerName, color, referralCode || undefined);
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
                        <h1 className="text-3xl font-bold text-white">Welcome to Roamin' Empire!</h1>
                        <p className="text-slate-300 text-lg leading-relaxed">
                            Build your empire by walking! Claim real-world territory and conquer the map, one square at a time.
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
                            <li className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>Capture territory to earn bonus coins</span>
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

                        {/* Referral Code */}
                        <div className="border-t border-slate-600 pt-3">
                            <button
                                type="button"
                                onClick={() => setShowReferralInput(!showReferralInput)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors w-full"
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform ${showReferralInput ? 'rotate-180' : ''}`} />
                                Invited by a friend?
                            </button>
                            {showReferralInput && (
                                <input
                                    type="text"
                                    value={referralCode}
                                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                    placeholder="Enter friend code"
                                    maxLength={6}
                                    className="mt-2 w-full px-4 py-2 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:border-yellow-500 focus:outline-none transition-colors uppercase tracking-widest font-mono"
                                />
                            )}
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

                        {/* Age & Legal Gate */}
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mt-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={agreedLegal}
                                    onChange={(e) => setAgreedLegal(e.target.checked)}
                                    className="mt-1 w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-700"
                                />
                                <span className="text-xs text-slate-300">
                                    I confirm I am <b>13 years of age or older</b>, and I have read and agree to the <a href="/legal/eula.html" target="_blank" className="text-blue-400 hover:underline">EULA</a> and <a href="/legal/privacy.html" target="_blank" className="text-blue-400 hover:underline">Privacy Policy</a>.
                                </span>
                            </label>
                        </div>

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
                        disabled={(step === 2 && explorerName.length < 3) || (step === 3 && !agreedLegal)}
                        className="flex-1 py-3 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {step === 3 ? 'Start Exploring!' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
}
