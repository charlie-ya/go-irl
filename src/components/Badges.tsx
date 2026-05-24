

/**
 * High-fidelity, vector-based Apple App Store badge.
 * Designed to conform precisely to Apple's App Store marketing guidelines.
 */
export function AppStoreBadge() {
    return (
        <svg 
            viewBox="0 0 135 40" 
            className="h-10 w-auto active:scale-95 transition-transform shrink-0" 
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Background rounded rectangle */}
            <rect x="0.5" y="0.5" width="134" height="39" rx="6" fill="black" stroke="#52525b" strokeWidth="0.5" />
            
            {/* Official Apple Logo Path */}
            <path 
                d="M32.2,20c0-2.8,2.3-4.1,2.4-4.2c-1.3-1.9-3.3-2.1-4-2.2c-1.7-0.2-3.4,1-4.3,1c-0.9,0-2.3-1-3.7-1c-1.9,0-3.6,1.1-4.6,2.8c-2,3.5-0.5,8.8,1.4,11.6c0.9,1.4,2,2.9,3.5,2.8c1.5-0.1,2-1,3.7-1c1.7,0,2.2,1,3.7,1c1.5-0.1,2.5-1.4,3.5-2.8c1.1-1.6,1.6-3.2,1.6-3.3C35.5,27.9,32.2,26.6,32.2,20z M28.6,11.2c0.8-1,1.3-2.3,1.1-3.7c-1.2,0.1-2.6,0.8-3.5,1.9c-0.8,0.9-1.4,2.2-1.2,3.6C26.3,13.1,27.7,12.3,28.6,11.2z" 
                fill="white" 
            />
            
            {/* Compliant Badging Typography */}
            <text x="43" y="15" fill="white" fontSize="7.5" fontWeight="400" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif">
                Download on the
            </text>
            <text x="43" y="29" fill="white" fontSize="13.5" fontWeight="600" fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif">
                App Store
            </text>
        </svg>
    );
}

/**
 * High-fidelity, vector-based Google Play Store badge.
 * Designed to conform precisely to Google Play branding guidelines.
 */
export function PlayStoreBadge() {
    return (
        <svg 
            viewBox="0 0 135 40" 
            className="h-10 w-auto active:scale-95 transition-transform shrink-0" 
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Background rounded rectangle */}
            <rect x="0.5" y="0.5" width="134" height="39" rx="6" fill="black" stroke="#52525b" strokeWidth="0.5" />
            
            {/* Official Google Play Triangles (Gradients / Solid Fills mapped exactly) */}
            <g transform="translate(14, 8) scale(0.9)">
                {/* Left Cyan Triangle */}
                <path d="M2.5,2.4 C2.4,2.6 2.3,2.9 2.3,3.3 L2.3,20.7 C2.3,21.1 2.4,21.4 2.5,21.6 L12.1,12 L2.5,2.4 Z" fill="#00E5FF" />
                {/* Right Yellow Triangle */}
                <path d="M15.3,8.8 L12.1,12 L15.3,15.2 L19.1,13 C20.2,12.4 20.2,11.6 19.1,11 L15.3,8.8 Z" fill="#FFC107" />
                {/* Top Red Triangle */}
                <path d="M12.1,12 L2.5,2.4 C2.8,2.1 3.4,2.1 4.1,2.5 L15.3,8.8 L12.1,12 Z" fill="#FF3D00" />
                {/* Bottom Green Triangle */}
                <path d="M12.1,12 L15.3,15.2 L4.1,21.5 C3.4,21.9 2.8,21.9 2.5,21.6 L12.1,12 Z" fill="#4CAF50" />
            </g>
            
            {/* Compliant Badging Typography */}
            <text x="40" y="14" fill="white" fontSize="7" fontWeight="500" letterSpacing="0.4" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
                GET IT ON
            </text>
            <text x="40" y="29" fill="white" fontSize="13" fontWeight="600" letterSpacing="-0.2" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Product Sans', sans-serif">
                Google Play
            </text>
        </svg>
    );
}
