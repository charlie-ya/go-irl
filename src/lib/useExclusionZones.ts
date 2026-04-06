import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './firebase';
import { getGeohash } from './geohashUtils';
import type { ExclusionZone } from './exclusionZones';

const requestedRegions = new Set<string>();

export function useExclusionZones(userLat?: number, userLng?: number) {
    const [zones, setZones] = useState<ExclusionZone[]>([]);
    const [loading, setLoading] = useState(true);

    // 1. Fetch zones
    useEffect(() => {
        const zonesRef = collection(db, 'zones');
        const q = query(zonesRef, where('isActive', '==', true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedZones: ExclusionZone[] = [];
            snapshot.forEach((doc) => {
                fetchedZones.push({ id: doc.id, ...doc.data() } as ExclusionZone);
            });
            setZones(fetchedZones);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching exclusion zones:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 2. Trigger Sacred Zones seeding if entering a new geohash-5 area
    useEffect(() => {
        if (userLat === undefined || userLng === undefined) return;

        const geohash5 = getGeohash(userLat, userLng).substring(0, 5);
        if (requestedRegions.has(geohash5)) return;
        requestedRegions.add(geohash5);

        const checkAndSeed = async () => {
            try {
                const regionRef = doc(db, 'scannedRegions', geohash5);
                const snap = await getDoc(regionRef);
                
                // If not complete, trigger cloud function
                if (!snap.exists() || snap.data()?.status === 'failed') {
                    console.log(`[SacredZones] Region ${geohash5} not scanned, triggering seed...`);
                    const functions = getFunctions();
                    // Assumes functions are initialized properly (they should be if firebase app is)
                    const seedSacredZones = httpsCallable(functions, 'seedSacredZones');
                    await seedSacredZones({ geohash5 });
                }
            } catch (error) {
                console.error(`[SacredZones] Failed to check/trigger seed for ${geohash5}:`, error);
            }
        };

        checkAndSeed();
    }, [userLat, userLng]);

    return { zones, loading };
}
