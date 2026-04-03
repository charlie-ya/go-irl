interface ColorPickerProps {
    selectedColor: string;
    onColorChange: (color: string) => void;
}

const PRESET_COLORS = [
    '#FF1744', // Scarlet
    '#FF5722', // Vermillion
    '#FF9100', // Tangerine
    '#76FF03', // Chartreuse
    '#00E676', // Neon Green
    '#1DE9B6', // Mint
    '#00E5FF', // Cyan
    '#00A9E0', // Cerulean
    '#2979FF', // Electric Blue
    '#304FFE', // Cobalt
    '#6200EA', // Royal
    '#AA00FF', // Purple
    '#D500F9', // Magenta
    '#C51162', // Rose
    '#F50057', // Crimson
];

export function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
                {PRESET_COLORS.map((color) => (
                    <button
                        key={color}
                        onClick={() => onColorChange(color)}
                        className={`w-full aspect-square rounded-lg transition-all ${selectedColor === color
                            ? 'ring-4 ring-white ring-offset-2 ring-offset-slate-800 scale-110'
                            : 'hover:scale-105'
                            }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                    />
                ))}
            </div>
        </div>
    );
}
