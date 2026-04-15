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
    blockLeader?: string;
    isBlockLeaderMe?: boolean;
    tilesCount: number;
    territoriesCount: number;
}

// Tiered chyron messages by player progression.
// Beginners see coaching tips; experienced players see general tips.
function getDefaultMessages(tilesCount: number, territoriesCount: number): ChyronMessage[] {
    if (tilesCount === 0) return [
        { id: 'new_01', type: 'tutorial', icon: '👣', content: 'Step outside and tap CLAIM to grab your first square!', priority: 1 },
        { id: 'new_02', type: 'tutorial', icon: '🗺️', content: 'Walk around your neighbourhood to build your empire!', priority: 1 },
    ];
    if (tilesCount === 1) return [
        { id: 'first_01', type: 'tutorial', icon: '✅', content: 'First square claimed! Now walk to a new spot and claim another.', priority: 1 },
        { id: 'first_02', type: 'tutorial', icon: '🏃', content: 'Each claim needs your real-world footsteps — you can\'t claim standing still!', priority: 1 },
    ];
    if (tilesCount < 5) return [
        { id: 'early_01', type: 'tutorial', icon: '🏃', content: 'Keep walking! Claim squares in a ring to capture territory for bonus coins.', priority: 1 },
        { id: 'early_02', type: 'tutorial', icon: '💡', content: 'Tip: A connected loop of your squares captures the area inside!', priority: 1 },
        { id: 'early_03', type: 'tutorial', icon: '💰', content: 'Captures earn you bonus coins — the bigger the loop, the bigger the reward!', priority: 1 },
    ];
    if (tilesCount >= 5 && territoriesCount === 0) return [
        { id: 'cap_01', type: 'tutorial', icon: '🎯', content: 'Ready for a capture? Walk your claims in a loop — the inside fills automatically!', priority: 1 },
        { id: 'cap_02', type: 'tutorial', icon: '💡', content: 'Tip: Even a small 3×3 ring earns bonus coins when you close it!', priority: 1 },
        { id: 'cap_03', type: 'tutorial', icon: '🏃', content: 'Keep moving and connect your squares into a closed perimeter to capture!', priority: 1 },
    ];
    // Experienced player — standard tip rotation
    return [
        { id: 'tut_01', type: 'tutorial', icon: '💡', content: 'Tip: Enclose an area to capture territory!', priority: 1 },
        { id: 'tut_02', type: 'tutorial', icon: '🏃', content: 'Tip: Move around to discover new tiles!', priority: 1 },
        { id: 'tut_03', type: 'tutorial', icon: '🏃', content: 'Sorry, couch potatoes, you have to get up to play!', priority: 1 },
        { id: 'tut_04', type: 'tutorial', icon: '👑', content: 'Tip: Lead your block by claiming more land!', priority: 1 },
        { id: 'tut_05', type: 'tutorial', icon: '💰', content: 'Tip: Capture territory to earn bonus coins!', priority: 1 },
        { id: 'tut_06', type: 'tutorial', icon: '🏃', content: 'Tip: Standing on someone else\'s square? Make an offer!', priority: 1 },
    ];
}

export function ScrollingChyron({ claims, userLat, userLng, myId, blockLeader, isBlockLeaderMe, tilesCount, territoriesCount }: ScoringChyronProps) {
    const [messages, setMessages] = useState<ChyronMessage[]>(() => getDefaultMessages(tilesCount, territoriesCount));
    const lastGridKeyRef = useRef<string | null>(null);

    // Re-build base messages when player progression changes
    useEffect(() => {
        setMessages(prev => {
            const base = getDefaultMessages(tilesCount, territoriesCount);
            // Preserve any injected welcome/leader messages at the front
            const injected = prev.filter(m => m.type === 'welcome' || m.id.startsWith('leader_'));
            return [...injected, ...base];
        });
    }, [tilesCount, territoriesCount]);

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
