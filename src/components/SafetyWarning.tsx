import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { LegalLink } from './LegalLink';

interface SafetyWarningProps {
    onAcknowledge: () => void;
}

export function SafetyWarning({ onAcknowledge }: SafetyWarningProps) {
    const [ageConfirmed, setAgeConfirmed] = useState(false);

    const handleDismiss = () => {
        localStorage.setItem('safety_warning_seen', Date.now().toString());
        onAcknowledge();
    };

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border-2 border-blue-500 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300 h-max max-h-[90vh] overflow-y-auto">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="bg-blue-500/20 p-4 rounded-full">
                        <MapPin className="w-12 h-12 text-blue-500" />
                    </div>

                    <h2 className="text-2xl font-bold text-white">Location Tracking Required</h2>

                    <div className="text-slate-300 text-sm space-y-4 text-left">
                        <p>
                            Roamin' Empire relies entirely on geolocation to function. By continuing, you agree to let us track and collect your precise GPS location <b>only while the app is actively running in the foreground.</b>
                        </p>
                        <p>
                            <strong className="text-amber-400">DO NOT TRESPASS.</strong><br />
                            Capture regions from public sidewalks and perimeters. Do not enter private property. Stay entirely aware of your surroundings.
                        </p>

                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mt-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={ageConfirmed}
                                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                                    className="mt-1 w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-blue-500 bg-slate-700"
                                />
                                <span className="text-xs text-slate-300">
                                    I confirm I am <b>13 years of age or older</b>, and I have read and agree to the <LegalLink url="/legal/eula.html" label="EULA" /> and <LegalLink url="/legal/privacy.html" label="Privacy Policy" />.
                                </span>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        disabled={!ageConfirmed}
                        className="mt-4 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                        Accept & Continue
                    </button>
                    
                    <p className="text-[10px] text-slate-500 mt-2">
                        If you do not agree, please close the app.
                    </p>
                </div>
            </div>
        </div>
    );
}
