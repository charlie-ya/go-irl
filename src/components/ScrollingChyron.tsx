import { useState, useEffect } from 'react';
import './ScrollingChyron.css';
import { getGridKey } from '../lib/gridSystem';

interface ChyronMessage {
    id: string;
    type: 'tutorial' | 'system' | 'user' | 'welcome';
    icon: string;
    content: string;
    authorName?: string;
    priority?: number; // Higher is better
}

interface ScoringChyronProps {
    claims: Record<string, any>;
    userLat: number | null;
    userLng: number | null;
    myId?: string;
}

// Static tutorial messages
const TUTORIAL_MESSAGES: ChyronMessage[] = [
    {
        id: 'tut_01',
        type: 'tutorial',
        icon: '💡',
        content: 'Enclose areas with your tiles to capture territory!',
        priority: 1
    },
    {
        id: 'tut_05',
        type: 'tutorial',
        icon: '👥',
        content: 'Reach level 10 to post messages to other explorers!',
        priority: 1
    }
];

export function ScrollingChyron({ claims, userLat, userLng, myId }: ScoringChyronProps) {
    const [messages, setMessages] = useState<ChyronMessage[]>(TUTORIAL_MESSAGES);
    const [lastWelcomeId, setLastWelcomeId] = useState<string | null>(null);

    // Dynamic Welcome Message Logic
    useEffect(() => {
        if (!userLat || !userLng || !claims) return;

        const currentKey = getGridKey(userLat, userLng);
        const tile = claims[currentKey];

        if (tile && tile.ownerId !== myId) {
            // We are on someone else's land!
            const welcomeId = `welcome_${tile.ownerId}_${currentKey}`;

            // Prevent spamming the same welcome message
            if (lastWelcomeId !== welcomeId) {
                const flower = tile.officialFlower || 'flower';
                const bird = tile.officialBird || 'bird';
                const ownerName = tile.explorerName || 'Unknown Explorer';

                const newMsg: ChyronMessage = {
                    id: welcomeId,
                    type: 'welcome',
                    icon: '🌿', // Nature icon
                    content: `Listen closely... the song of the ${bird} welcomes you to ${ownerName}'s domain. The ${flower} is in bloom.`,
                    priority: 10 // High priority
                };

                // Add to front of queue
                setMessages(prev => [newMsg, ...prev.filter(m => m.type !== 'welcome')]); // Replace old welcome
                setLastWelcomeId(welcomeId);
            }
        } else if (!tile || tile.ownerId === myId) {
            // Left the land or on own land, clear welcome?
            // Optional: Let it scroll off naturally, or remove it.
            // For now, let's leave it to scroll.
        }

    }, [claims, userLat, userLng, myId]);


    if (messages.length === 0) return null;

    return (
        <>
            {/* Blur zone behind chyron */}
            <div className="chyron-blur-zone" />

            {/* Scrolling chyron */}
            <div className="chyron-container">
                <div className="chyron-wrapper">
                    <div className="chyron-content">
                        {/* First set of messages */}
                        {messages.map((msg, index) => (
                            <span key={`${msg.id}-1`}>
                                <span className="chyron-icon">{msg.icon}</span>
                                <span className={`chyron-message ${msg.type} ${msg.type === 'welcome' ? 'chyron-script' : ''}`}>
                                    {msg.type === 'user' && msg.authorName && `@${msg.authorName}: `}
                                    {msg.content}
                                </span>
                                {index < messages.length - 1 && (
                                    <span className="chyron-separator">●</span>
                                )}
                            </span>
                        ))}
                        <span className="chyron-separator">●</span>
                        {/* Duplicate for seamless loop */}
                        {messages.map((msg, index) => (
                            <span key={`${msg.id}-2`}>
                                <span className="chyron-icon">{msg.icon}</span>
                                <span className={`chyron-message ${msg.type} ${msg.type === 'welcome' ? 'chyron-script' : ''}`}>
                                    {msg.type === 'user' && msg.authorName && `@${msg.authorName}: `}
                                    {msg.content}
                                </span>
                                {index < messages.length - 1 && (
                                    <span className="chyron-separator">●</span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
