import { useState, useEffect } from 'react';
import { ColorPicker } from './ColorPicker';
import { LegalLink } from './LegalLink';
import { MapPin, User, ChevronDown, BookOpen } from 'lucide-react';
import { getReferralCodeFromURL } from '../lib/referralService';

// --- Step 4 Illustrations ---

/** Mini map grid showing: one claimed square, arrow, one "next" unclaimed square. */
function WalkDiagram() {
    const grid = [
        [null, null, null, null],
        [null, 'mine', 'next', null],
        [null, null, null, null],
        [null, null, null, null],
    ];
    return (
        <div className="flex flex-col items-center gap-3">
            <div
                className="grid gap-0.5 p-2 bg-slate-900 rounded-xl border border-slate-700 shadow-inner"
                style={{ gridTemplateColumns: 'repeat(4, 2.5rem)' }}
            >
                {grid.flat().map((cell, i) => {
                    if (cell === 'mine') return (
                        <div key={i} className="w-10 h-10 rounded-md bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-lg ring-2 ring-indigo-300">
                            YOU
                        </div>
                    );
                    if (cell === 'next') return (
                        <div key={i} className="w-10 h-10 rounded-md border-2 border-dashed border-indigo-400 flex items-center justify-center animate-pulse">
                            <span className="text-indigo-400 text-lg">→</span>
                        </div>
                    );
                    return <div key={i} className="w-10 h-10 rounded-md bg-slate-800/60" />;
                })}
            </div>
            <p className="text-slate-300 text-sm text-center leading-relaxed max-w-[240px]">
                Each square you claim must be where you're <strong className="text-white">physically standing</strong>. Walk to the next square!
            </p>
        </div>
    );
}

/** Mini map grid showing a ring of claimed squares with interior "captured" fill. */
function CaptureDiagram() {
    // 5×5 grid: 'ring' = perimeter claimed squares, 'fill' = captured interior, null = empty
    const grid = [
        [null,   null,   null,   null,   null  ],
        [null,   'ring', 'ring', 'ring', null  ],
        [null,   'ring', 'fill', 'ring', null  ],
        [null,   'ring', 'ring', 'close',null  ],
        [null,   null,   null,   null,   null  ],
    ];

    return (
        <div className="flex flex-col items-center gap-3">
            <div
                className="grid gap-0.5 p-2 bg-slate-900 rounded-xl border border-slate-700 shadow-inner"
                style={{ gridTemplateColumns: 'repeat(5, 2rem)' }}
            >
                {grid.flat().map((cell, i) => {
                    if (cell === 'ring') return (
                        <div key={i} className="w-8 h-8 rounded-sm bg-indigo-500 shadow" />
                    );
                    if (cell === 'fill') return (
                        <div key={i} className="w-8 h-8 rounded-sm bg-indigo-300/60 animate-pulse" />
                    );
                    if (cell === 'close') return (
                        <div key={i} className="w-8 h-8 rounded-sm bg-yellow-400 shadow-lg ring-2 ring-yellow-200 flex items-center justify-center text-yellow-900 text-[10px] font-black">
                            ★
                        </div>
                    );
                    return <div key={i} className="w-8 h-8 rounded-sm bg-slate-800/60" />;
                })}
            </div>
            <p className="text-slate-300 text-sm text-center leading-relaxed max-w-[240px]">
                Claim a <strong className="text-white">connected ring</strong> of squares. The enclosed area fills automatically earning you <strong className="text-yellow-400">bonus coins</strong>!
            </p>
        </div>
    );
}

/** Step 4: two-panel how-to-play slide. */
function HowToPlayStep() {
    const [panel, setPanel] = useState<0 | 1>(0);
    return (
        <div className="space-y-4 text-center">
            <div className="w-16 h-16 mx-auto bg-emerald-600 rounded-full flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">How to Play</h2>

            {/* Panel toggle tabs */}
            <div className="flex rounded-lg overflow-hidden border border-slate-600 w-fit mx-auto">
                {(['Walk & Claim', 'Capture']).map((label, idx) => (
                    <button
                        key={label}
                        onClick={() => setPanel(idx as 0 | 1)}
                        className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
                            panel === idx
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="flex justify-center py-2 min-h-[180px] items-center">
                {panel === 0 ? <WalkDiagram /> : <CaptureDiagram />}
            </div>

            <p className="text-slate-500 text-xs">
                {panel === 0 ? 'Tap "Capture" to see the next tip →' : '← Tap "Walk & Claim" to go back'}
            </p>
        </div>
    );
}

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
            setStep(4);
        } else if (step === 4) {
            onComplete(explorerName, color, referralCode || undefined);
        }
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh]">
                {/* Progress Indicator — pinned top */}
                <div className="flex gap-2 mb-4 flex-shrink-0">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className={`h-2 flex-1 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-slate-600'
                                }`}
                        />
                    ))}
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-1">
                    {/* Step 1: Welcome */}
                    {step === 1 && (
                        <div className="space-y-4 text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-blue-500 rounded-full flex items-center justify-center">
                                <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">Welcome to Roamin' Empire!</h1>
                            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
                                Build your empire by walking! Claim real-world territory and conquer the map, one square at a time.
                            </p>
                            <ul className="text-left text-slate-300 space-y-2 text-sm sm:text-base">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>Walk to squares and claim them with coins</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>Surround areas to capture territory</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>Your identity stays private - only your explorer name shows</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-400 mt-0.5">•</span>
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

                    {/* Step 4: How to Play */}
                    {step === 4 && <HowToPlayStep />}

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
                                        I confirm I am <b>13 years of age or older</b>, and I have read and agree to the <LegalLink url="/legal/eula.html" label="EULA" /> and <LegalLink url="/legal/privacy.html" label="Privacy Policy" />.
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
                </div>

                {/* Navigation Buttons — pinned bottom */}
                <div className="flex gap-3 pt-4 flex-shrink-0">
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
                        {step === 4 ? 'Start Exploring! 🗺️' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
}
