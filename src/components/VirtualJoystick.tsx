import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
    onMove: (dLat: number, dLng: number) => void;
}

export function VirtualJoystick({ onMove }: VirtualJoystickProps) {
    const baseRef = useRef<HTMLDivElement>(null);
    const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    
    const activeDirectionRef = useRef<{dLat: number, dLng: number} | null>(null);
    const repeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const triggerMove = useCallback((dLat: number, dLng: number) => {
        onMove(dLat, dLng);
    }, [onMove]);

    const stopRepeat = () => {
        if (repeatTimeoutRef.current) clearTimeout(repeatTimeoutRef.current);
        if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
        repeatTimeoutRef.current = null;
        repeatIntervalRef.current = null;
        activeDirectionRef.current = null;
    };

    const updateDirection = (dx: number, dy: number, distance: number) => {
        const ACTIVE_THRESHOLD = 20;
        
        if (distance < ACTIVE_THRESHOLD) {
            stopRepeat();
            return;
        }
        
        // Determine primary axis
        let newDir = null;
        // The game grid interprets `1` dLat as UP and `1` dLng as RIGHT
        if (Math.abs(dx) > Math.abs(dy)) {
            newDir = dx > 0 ? { dLat: 0, dLng: 1 } : { dLat: 0, dLng: -1 };
        } else {
            newDir = dy > 0 ? { dLat: -1, dLng: 0 } : { dLat: 1, dLng: 0 };
        }

        // Check if direction changed
        const currentDir = activeDirectionRef.current;
        if (!currentDir || currentDir.dLat !== newDir.dLat || currentDir.dLng !== newDir.dLng) {
            stopRepeat();
            activeDirectionRef.current = newDir;
            
            // Immediate tick
            triggerMove(newDir.dLat, newDir.dLng);
            
            // Start repeating after an initial delay (like a keyboard key hold)
            repeatTimeoutRef.current = setTimeout(() => {
                repeatIntervalRef.current = setInterval(() => {
                    triggerMove(newDir.dLat, newDir.dLng);
                }, 200); // Repeat interval speed
            }, 400); // Hold delay before repeating
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        handlePointerMove(e);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !baseRef.current) return;
        
        const rect = baseRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = e.clientX - centerX;
        let dy = e.clientY - centerY;
        
        const distance = Math.sqrt(dx*dx + dy*dy);
        const maxRadius = rect.width / 2 - 24; // 24 is half the stick visual width
        
        let vizDx = dx;
        let vizDy = dy;
        if (distance > maxRadius) {
            vizDx = (dx / distance) * maxRadius;
            vizDy = (dy / distance) * maxRadius;
        }
        
        setStickPos({ x: vizDx, y: vizDy });
        updateDirection(dx, dy, distance);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        setStickPos({ x: 0, y: 0 });
        stopRepeat();
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    useEffect(() => {
        return () => stopRepeat();
    }, []);

    return (
        <div 
            ref={baseRef}
            className="relative w-28 h-28 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/50 shadow-2xl flex items-center justify-center touch-none pointer-events-auto"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            {/* Background directional notches */}
            <div className="absolute inset-0 rounded-full border-2 border-slate-800/30 m-3" />
            <div className="absolute top-2 w-1.5 h-3 bg-white/20 rounded-full" />
            <div className="absolute bottom-2 w-1.5 h-3 bg-white/20 rounded-full" />
            <div className="absolute left-2 w-3 h-1.5 bg-white/20 rounded-full" />
            <div className="absolute right-2 w-3 h-1.5 bg-white/20 rounded-full" />
            
            {/* The stick */}
            <div 
                className="absolute w-12 h-12 rounded-full bg-slate-700/80 border border-slate-500/50 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center transition-transform"
                style={{ 
                    transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
                    transitionDuration: isDragging ? '0s' : '0.2s',
                    transitionTimingFunction: 'ease-out'
                }}
            >
                <div className="w-5 h-5 rounded-full bg-white/10 border border-white/5" />
            </div>
        </div>
    );
}
