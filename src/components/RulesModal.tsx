import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Map, Maximize, Ban, Coins, Crown } from 'lucide-react';

interface RulesModalProps {
    onClose: () => void;
}

export function RulesModal({ onClose }: RulesModalProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            title: "Welcome to the Empire",
            icon: <Map className="w-12 h-12 text-blue-400 mb-4" />,
            text: "The real world is divided into an 11x11 meter grid. Walk around and claim tiles to expand your domain! Each claim costs 1 coin."
        },
        {
            title: "Territory Capture",
            icon: <Maximize className="w-12 h-12 text-green-400 mb-4" />,
            text: "Make the most of your coins by completely encircling unclaimed tiles. Once you create a closed loop, the entire enclosed area is instantly captured for free, and you earn bonus coins!"
        },
        {
            title: "Exclusion Zones",
            icon: <Ban className="w-12 h-12 text-yellow-400 mb-4" />,
            text: "We have two types of reserved zones. There is no play in Sacred spaces (Gold). Large Urban Public areas like Central Park (Yellow) are Reserved for now."
        },
        {
            title: "Trading & Collapses",
            icon: <Coins className="w-12 h-12 text-yellow-400 mb-4" />,
            text: "Want a tile someone else owns? Step onto their square to reveal the \"Make Offer\" button! Be careful though: if you sell one of your own tiles that forms the boundary of a captured territory, the entire territory will collapse!"
        },
        {
            title: "Ranks & Ascension",
            icon: <Crown className="w-12 h-12 text-amber-400 mb-4" />,
            text: "You begin as a Lowly Vassal. By gathering with other players in real life, you can perform promotion ceremonies to Ascend in rank and unlock greater powers!"
        },
        {
            title: "Nests & Guestbooks",
            icon: <img src="/assets/nests/nest_level1.png" alt="Nest" className="w-12 h-12 mb-4 drop-shadow-md object-contain" />,
            text: "Plant your nest at a real-world location. Visitors sign your guestbook to earn coins. Upgrade your nest to earn coins yourself! Three levels: 🪹 Nest → 🪹⭐ Dovecote → ⭐🪹⭐ Eyrie."
        }
    ];

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm pointer-events-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-slate-800">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                        style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 flex flex-col items-center text-center min-h-[320px] justify-center">
                    {slides[currentSlide].icon}
                    <h2 className="text-2xl font-black text-white mb-4 drop-shadow-sm">
                        {slides[currentSlide].title}
                    </h2>
                    <p className="text-slate-300 text-sm leading-relaxed font-medium">
                        {slides[currentSlide].text}
                    </p>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-800/50 border-t border-slate-700/50 flex justify-between items-center">
                    <button 
                        onClick={prevSlide}
                        disabled={currentSlide === 0}
                        className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                            currentSlide === 0 
                            ? 'text-slate-600 cursor-not-allowed' 
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95'
                        }`}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    {/* Dot Indicators */}
                    <div className="flex gap-2">
                        {slides.map((_, idx) => (
                            <div 
                                key={idx}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                    idx === currentSlide ? 'bg-blue-500 w-4' : 'bg-slate-600'
                                }`}
                            />
                        ))}
                    </div>

                    <button 
                        onClick={nextSlide}
                        disabled={currentSlide === slides.length - 1}
                        className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                            currentSlide === slides.length - 1 
                            ? 'text-slate-600 cursor-not-allowed' 
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95'
                        }`}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                {/* Done Button (Only on last slide) */}
                {currentSlide === slides.length - 1 && (
                    <div className="p-4 pt-0 bg-slate-800/50">
                        <button 
                            onClick={onClose}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]"
                        >
                            Got it! Let's Go
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
