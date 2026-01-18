// Script to delete all tiles from Firestore
// Run with: node scripts/clearTiles.cjs

const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
// Download from: Firebase Console > Project Settings > Service Accounts
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearAllTiles() {
    console.log('🗑️  Starting tile deletion...\n');

    try {
        // Get all tiles
        console.log('📥 Fetching tiles from Firestore...');
        const tilesSnapshot = await db.collection('tiles').get();
        console.log(`✓ Found ${tilesSnapshot.size} tiles to delete\n`);

        if (tilesSnapshot.size === 0) {
            console.log('No tiles to delete. Collection is already empty.');
            process.exit(0);
        }

        // Confirm deletion
        console.log('⚠️  WARNING: This will delete ALL tiles!');
        console.log(`   About to delete ${tilesSnapshot.size} tiles.\n`);

        let deleted = 0;
        const batchSize = 500;
        const tiles = tilesSnapshot.docs;

        for (let i = 0; i < tiles.length; i += batchSize) {
            const batch = db.batch();
            const batchDocs = tiles.slice(i, i + batchSize);

            for (const tileDoc of batchDocs) {
                batch.delete(tileDoc.ref);
            }

            await batch.commit();
            deleted += batchDocs.length;

            const progress = Math.round((deleted / tiles.length) * 100);
            console.log(`⏳ Progress: ${progress}% (${deleted}/${tiles.length} deleted)`);
        }

        console.log('\n✅ All tiles deleted successfully!');
        console.log('═'.repeat(50));
        console.log(`Total deleted: ${deleted}`);
        console.log('═'.repeat(50));
        console.log('\n🎮 Ready for fresh gameplay with optimized tile schema!');

    } catch (error) {
        console.error('\n❌ Deletion failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the deletion
clearAllTiles();
