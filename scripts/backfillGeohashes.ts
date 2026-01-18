import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getGeohash } from './src/lib/geohashUtils';
import { parseGridKey } from './src/lib/gridSystem';

// Firebase configuration (from your existing firebase.ts)
const firebaseConfig = {
    apiKey: "AIzaSyDlxLKCqjJqOZPSMBQqVqcJqOZPSMBQqVq",
    authDomain: "go-irl-443f4.firebaseapp.com",
    projectId: "go-irl-443f4",
    storageBucket: "go-irl-443f4.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function backfillGeohashes() {
    console.log('Starting geohash backfill...');

    try {
        // Get all tiles
        const tilesSnapshot = await getDocs(collection(db, "tiles"));
        console.log(`Found ${tilesSnapshot.size} tiles to process`);

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
                    console.error(`Error processing tile ${gridKey}:`, error);
                    errors++;
                }
            }

            // Execute batch updates
            await Promise.all(updatePromises);
            updated += updatePromises.length;

            console.log(`Progress: ${updated + skipped + errors}/${tiles.length} (${updated} updated, ${skipped} skipped, ${errors} errors)`);
        }

        console.log('\nBackfill complete!');
        console.log(`Total: ${tiles.length} tiles`);
        console.log(`Updated: ${updated}`);
        console.log(`Skipped: ${skipped} (already had geohash)`);
        console.log(`Errors: ${errors}`);

    } catch (error) {
        console.error('Backfill failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the backfill
backfillGeohashes();
