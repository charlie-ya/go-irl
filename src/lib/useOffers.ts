import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import type { Offer } from './gameState';

/**
 * Subscribes to pending offers where the current user is the seller.
 * Returns a live-updating list of incoming offers.
 */
export function useOffers(): Offer[] {
    const [offers, setOffers] = useState<Offer[]>([]);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
            collection(db, 'offers'),
            where('sellerId', '==', user.uid),
            where('status', '==', 'pending')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const incoming: Offer[] = [];
            snapshot.forEach(doc => incoming.push(doc.data() as Offer));
            // Newest first
            incoming.sort((a, b) => b.createdAt - a.createdAt);
            setOffers(incoming);
        });

        return () => unsub();
    }, [auth.currentUser]);

    return offers;
}

/**
 * Subscribes to pending offers where the current user is the buyer.
 * Returns a live-updating list of outgoing offers.
 */
export function useMyOutgoingOffers(): Offer[] {
    const [offers, setOffers] = useState<Offer[]>([]);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
            collection(db, 'offers'),
            where('buyerId', '==', user.uid),
            where('status', '==', 'pending')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const outgoing: Offer[] = [];
            snapshot.forEach(doc => outgoing.push(doc.data() as Offer));
            setOffers(outgoing);
        });

        return () => unsub();
    }, [auth.currentUser]);

    return offers;
}
