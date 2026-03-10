import { useState, useEffect, useRef } from 'react';
import './ScrollingChyron.css';
import { getGridKey } from '../lib/gridSystem';

interface ChyronMessage {
    id: string;
    type: 'tutorial' | 'system' | 'user' | 'welcome' | 'ad';
    icon: string;
    content: string;
    priority: number;
}

interface ScoringChyronProps {
    claims: Record<string, any>;
    userLat: number | null;
    userLng: number | null;
    myId?: string;
    blockLeader?: string; // Explorer name of the #1 player on the block
    isBlockLeaderMe?: boolean;
}

const DEFAULT_MESSAGES: ChyronMessage[] = [
    { id: 'tut_01', type: 'tutorial', icon: '💡', content: 'Tip: Enclose an area to capture territory!', priority: 1 },
    { id: 'ad_01', type: 'ad', icon: '☕', content: 'Need energy? Grab a coffee at Joe\'s!', priority: 1 },
    { id: 'tut_02', type: 'tutorial', icon: '🏃', content: 'Tip: Move around to discover new tiles!', priority: 1 },
    { id: 'tut_03', type: 'tutorial', icon: '👑', content: 'Climb the ranks by claiming more land!', priority: 1 },
    { id: 'tut_04', type: 'tutorial', icon: '💰', content: 'Tip: Capture territory to earn bonus coins!', priority: 1 },
];

export function ScrollingChyron({ claims, userLat, userLng, myId, blockLeader, isBlockLeaderMe }: ScoringChyronProps) {
    // Current list of messages to display in the loop
    const [messages, setMessages] = useState<ChyronMessage[]>(DEFAULT_MESSAGES);
    const lastGridKeyRef = useRef<string | null>(null);

    // Monitor location for Welcome messages
    useEffect(() => {
        if (!userLat || !userLng || !claims) return;

        const currentKey = getGridKey(userLat, userLng);

        if (lastGridKeyRef.current !== currentKey) {
            lastGridKeyRef.current = currentKey;

            const tile = claims[currentKey];
            if (tile && tile.ownerId !== myId) {
                const ownerName = tile.explorerName || 'Unknown';
                const rank = tile.ownerRank || 'Explorer';

                const welcomeMsg: ChyronMessage = {
                    id: `welcome_${currentKey}_${Date.now()}`,
                    type: 'welcome',
                    icon: '👋',
                    content: `${ownerName}, a ${rank}, welcomes you.`,
                    priority: 10
                };

                // Add to messages list
                // We keep the list relatively short, maybe max 6 items?
                // For now, just prepend it and let it scroll.
                setMessages(prev => {
                    // Remove old welcomes to keep it fresh? Or just append.
                    // Let's keep the default messages and add the welcome at the start.
                    const withoutOldWelcomes = prev.filter(m => m.type !== 'welcome');
                    return [welcomeMsg, ...withoutOldWelcomes];
                });
            }
        }
    }, [userLat, userLng, claims, myId]);

    // Inject block leader message
    useEffect(() => {
        if (!blockLeader) return;

        const leaderMsg: ChyronMessage = {
            id: `leader_${Date.now()}`,
            type: 'system',
            icon: isBlockLeaderMe ? '👑' : '⚔️',
            content: isBlockLeaderMe
                ? 'You rule this block!'
                : `${blockLeader} leads this area`,
            priority: 8
        };

        setMessages(prev => {
            const withoutOldLeader = prev.filter(m => !m.id.startsWith('leader_'));
            return [leaderMsg, ...withoutOldLeader];
        });
    }, [blockLeader, isBlockLeaderMe]);


    // Duplicate messages for seamless loop
    // We render the list twice in the scrolling wrapper
    const displayList = [...messages, ...messages];

    return (
        <>
            <div className="chyron-blur-zone" />
            <div className="chyron-container">
                <div className="chyron-wrapper" style={{ animationDuration: `${Math.max(20, messages.length * 8)}s` }}>
                    <div className="chyron-content">
                        {displayList.map((msg, index) => (
                            <div key={`${msg.id}-${index}`} className="chyron-item">
                                <span className="chyron-icon">{msg.icon}</span>
                                <span className={`chyron-text ${msg.type}`}>
                                    {msg.content}
                                </span>
                                <span className="ml-8 text-slate-600 text-[10px]">●</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
