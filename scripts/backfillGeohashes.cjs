// Backfill script using Firebase Admin SDK
// Run with: node scripts/backfillGeohashes.cjs

const admin = require('firebase-admin');
const ngeohash = require('ngeohash');

// Initialize Firebase Admin with service account
// You can download this from Firebase Console > Project Settings > Service Accounts
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
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
    return ngeohash.encode(lat, lng, GEOHASH_PRECISION);
}

async function backfillGeohashes() {
    console.log('🚀 Starting geohash backfill...\n');

    try {
        // Get all tiles
        console.log('📥 Fetching tiles from Firestore...');
        const tilesSnapshot = await db.collection('tiles').get();
        console.log(`✓ Found ${tilesSnapshot.size} tiles to process\n`);

        if (tilesSnapshot.size === 0) {
            console.log('No tiles to process. Exiting.');
            process.exit(0);
        }

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches
        const batchSize = 500; // Admin SDK can handle larger batches
        const tiles = tilesSnapshot.docs;

        for (let i = 0; i < tiles.length; i += batchSize) {
            const batch = db.batch();
            const batchDocs = tiles.slice(i, i + batchSize);
            let batchUpdates = 0;

            for (const tileDoc of batchDocs) {
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

                    // Add to batch
                    batch.update(tileDoc.ref, {
                        geohash,
                        lat,
                        lng
                    });
                    batchUpdates++;
                } catch (error) {
                    console.error(`❌ Error processing tile ${gridKey}:`, error.message);
                    errors++;
                }
            }

            // Commit batch if there are updates
            if (batchUpdates > 0) {
                await batch.commit();
                updated += batchUpdates;
            }

            // Progress update
            const progress = Math.round(((i + batchDocs.length) / tiles.length) * 100);
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
        }

    } catch (error) {
        console.error('\n❌ Backfill failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the backfill
backfillGeohashes();
