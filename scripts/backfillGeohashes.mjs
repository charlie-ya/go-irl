// Backfill script to add geohash fields to existing tiles
// Run with: node scripts/backfillGeohashes.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { encode as geohashEncode } from 'ngeohash';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Firebase configuration from environment
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Constants
const GEOHASH_PRECISION = 6;

// Parse grid key to get coordinates
function parseGridKey(key) {
    const [latStr, lngStr] = key.split(',');
    return {
        lat: parseFloat(latStr),
        lng: parseFloat(lngStr),
    };
}

// Get geohash for coordinates
function getGeohash(lat, lng) {
    return geohashEncode(lat, lng, GEOHASH_PRECISION);
}

async function backfillGeohashes() {
    console.log('🚀 Starting geohash backfill...\n');

    try {
        // Get all tiles
        console.log('📥 Fetching tiles from Firestore...');
        const tilesSnapshot = await getDocs(collection(db, "tiles"));
        console.log(`✓ Found ${tilesSnapshot.size} tiles to process\n`);

        if (tilesSnapshot.size === 0) {
            console.log('No tiles to process. Exiting.');
            process.exit(0);
        }

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches to avoid overwhelming Firestore
        const batchSize = 50;
        const tiles = tilesSnapshot.docs;

        for (let i = 0; i < tiles.length; i += batchSize) {
            const batch = tiles.slice(i, i + batchSize);
            const updatePromises = [];

            for (const tileDoc of batch) {
                const gridKey = tileDoc.id;
                const tileData = tileDoc.data();

                // Skip if already has geohash
                if (tileData.geohash) {
                    skipped++;
                    continue;
                }

                try {
                    // Parse grid key to get coordinates
                    const { lat, lng } = parseGridKey(gridKey);
                    const geohash = getGeohash(lat, lng);

                    // Update tile with geohash fields
                    updatePromises.push(
                        updateDoc(doc(db, "tiles", tileDoc.id), {
                            geohash,
                            lat,
                            lng
                        })
                    );
                } catch (error) {
                    console.error(`❌ Error processing tile ${gridKey}:`, error.message);
                    errors++;
                }
            }

            // Execute batch updates
            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
                updated += updatePromises.length;
            }

            // Progress update
            const progress = Math.round(((i + batch.length) / tiles.length) * 100);
            console.log(`⏳ Progress: ${progress}% (${updated} updated, ${skipped} skipped, ${errors} errors)`);
        }

        console.log('\n✅ Backfill complete!');
        console.log('═'.repeat(50));
        console.log(`Total tiles:     ${tiles.length}`);
        console.log(`Updated:         ${updated}`);
        console.log(`Skipped:         ${skipped} (already had geohash)`);
        console.log(`Errors:          ${errors}`);
        console.log('═'.repeat(50));

        if (errors > 0) {
            console.log('\n⚠️  Some tiles had errors. Check the logs above.');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Backfill failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the backfill
backfillGeohashes();
