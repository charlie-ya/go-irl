import { useState } from 'react';
import { X } from 'lucide-react';

interface LegalModalProps {
    url: string;
    label: string;
    className?: string;
}

/**
 * Opens legal documents (EULA, Privacy Policy) in an in-app modal iframe
 * instead of navigating away from the WebView, which breaks the Android back button.
 */
export function LegalLink({ url, label, className = 'text-blue-400 hover:underline' }: LegalModalProps) {
    const [open, setOpen] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
    };

    return (
        <>
            <a
                href={url}
                onClick={handleClick}
                className={className}
            >
                {label}
            </a>

            {open && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-white rounded-xl w-full max-w-lg h-[80vh] flex flex-col overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b">
                            <span className="font-semibold text-slate-700 text-sm">{label}</span>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>
                        <iframe
                            src={url}
                            className="flex-1 w-full"
                            title={label}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
