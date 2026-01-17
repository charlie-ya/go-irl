import { useState } from 'react';
import { getColorValidationMessage } from '../lib/colorValidation';

interface ColorPickerProps {
    selectedColor: string;
    onColorChange: (color: string) => void;
}

const PRESET_COLORS = [
    '#FF6B6B', // Vibrant Red
    '#4ECDC4', // Turquoise
    '#45B7D1', // Sky Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Light Blue
    '#F8B739', // Orange
    '#52B788', // Green
    '#E63946', // Dark Red
    '#457B9D', // Steel Blue
];

export function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
    const [showCustom, setShowCustom] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleColorChange = (color: string) => {
        const validationMessage = getColorValidationMessage(color);

        if (validationMessage) {
            setErrorMessage(validationMessage);
            // Don't update the color if it's invalid
            return;
        }

        setErrorMessage(null);
        onColorChange(color);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
                {PRESET_COLORS.map((color) => (
                    <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        className={`w-full aspect-square rounded-lg transition-all ${selectedColor === color
                            ? 'ring-4 ring-white ring-offset-2 ring-offset-slate-800 scale-110'
                            : 'hover:scale-105'
                            }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                    />
                ))}
            </div>

            {errorMessage && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg text-sm">
                    {errorMessage}
                </div>
            )}

            <button
                onClick={() => setShowCustom(!showCustom)}
                className="w-full py-2 px-4 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
                {showCustom ? 'Hide Custom Color' : 'Choose Custom Color'}
            </button>

            {showCustom && (
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-16 h-16 rounded-lg cursor-pointer"
                    />
                    <div className="flex-1">
                        <input
                            type="text"
                            value={selectedColor}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                    if (val.length === 7) {
                                        handleColorChange(val);
                                    } else {
                                        // Allow typing but don't validate until complete
                                        onColorChange(val);
                                        setErrorMessage(null);
                                    }
                                }
                            }}
                            placeholder="#FF6B6B"
                            className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
