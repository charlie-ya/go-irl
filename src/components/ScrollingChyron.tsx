import { useState } from 'react';
import './ScrollingChyron.css';

interface ChyronMessage {
    id: string;
    type: 'tutorial' | 'system' | 'user';
    icon: string;
    content: string;
    authorName?: string;
}

// Static tutorial messages
const TUTORIAL_MESSAGES: ChyronMessage[] = [
    {
        id: 'tut_01',
        type: 'tutorial',
        icon: '💡',
        content: 'Enclose areas with your tiles to capture territory!'
    },
    {
        id: 'tut_02',
        type: 'tutorial',
        icon: '🪙',
        content: 'Each tile costs 1 coin. Plan your expansion carefully.'
    },
    {
        id: 'tut_03',
        type: 'tutorial',
        icon: '🏆',
        content: 'Captured territories earn you bonus coins over time.'
    },
    {
        id: 'tut_04',
        type: 'tutorial',
        icon: '🎯',
        content: 'Claim tiles near each other to build larger territories.'
    },
    {
        id: 'tut_05',
        type: 'tutorial',
        icon: '👥',
        content: 'Reach level 10 to post messages to other explorers!'
    }
];

export function ScrollingChyron() {
    const [messages] = useState<ChyronMessage[]>(TUTORIAL_MESSAGES);

    // TODO: Add Firestore integration for system and user messages
    // useEffect(() => {
    //     const messagesQuery = query(
    //         collection(db, 'chyronMessages'),
    //         where('isActive', '==', true),
    //         orderBy('priority', 'desc'),
    //         limit(20)
    //     );
    //     const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    //         // Update messages
    //     });
    //     return () => unsubscribe();
    // }, []);

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
                                <span className={`chyron-message ${msg.type}`}>
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
                                <span className={`chyron-message ${msg.type}`}>
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
