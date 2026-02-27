import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { STATIC_ZONES } from './exclusionZones';

export async function seedZones() {
    console.log("🌱 Seeding zones...");
    const batch = writeBatch(db);

    STATIC_ZONES.forEach((zone) => {
        const zoneRef = doc(collection(db, 'zones'), zone.id);
        batch.set(zoneRef, zone);
    });

    try {
        await batch.commit();
        console.log("✅ Zones seeded successfully!");
        alert("Zones seeded successfully!");
    } catch (error) {
        console.error("❌ Error seeding zones:", error);
        alert("Error seeding zones: " + error);
    }
}
