"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSacredZones = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const ngeohash = require("ngeohash");
const db = admin.firestore();
exports.seedSacredZones = functions.https.onCall(async (request) => {
    var _a, _b;
    // 1. Auth check (optional, but good practice to ensure only valid users trigger scans)
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated.');
    }
    const { geohash5 } = request.data;
    if (!geohash5 || typeof geohash5 !== 'string' || geohash5.length !== 5) {
        throw new functions.https.HttpsError('invalid-argument', 'Must provide a valid 5-character geohash.');
    }
    const regionRef = db.collection('scannedRegions').doc(geohash5);
    try {
        // 2. Check if region is already scanned or currently scanning
        const regionDoc = await regionRef.get();
        if (regionDoc.exists) {
            const data = regionDoc.data();
            if ((data === null || data === void 0 ? void 0 : data.status) === 'complete') {
                return { success: true, message: 'Region already complete', zoneCount: data.zoneCount };
            }
            if ((data === null || data === void 0 ? void 0 : data.status) === 'scanning') {
                // If started less than 5 mins ago, don't duplicate
                if (Date.now() - data.startedAt < 5 * 60 * 1000) {
                    return { success: true, message: 'Region currently scanning' };
                }
            }
        }
        // Mark as scanning
        const startedAt = Date.now();
        await regionRef.set({ status: 'scanning', startedAt });
        // 3. Decode geohash to bounding box
        const bbox = ngeohash.decode_bbox(geohash5);
        const [minlat, minlon, maxlat, maxlon] = bbox;
        // south, west, north, east
        const bboxString = `${minlat},${minlon},${maxlat},${maxlon}`;
        // 4. Overpass API query
        // We use 'out geom' to get actual coordinates instead of just node IDs
        const query = `
            [out:json][timeout:30];
            (
              node["amenity"="place_of_worship"](${bboxString});
              way["amenity"="place_of_worship"](${bboxString});
              relation["amenity"="place_of_worship"](${bboxString});
            );
            out geom;
        `;
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query,
            headers: {
                // Overpass asks for a meaningful User-Agent
                'User-Agent': 'RoaminEmpire/1.0 (CloudFunction; Firebase)'
            }
        });
        if (!response.ok) {
            throw new Error(`Overpass API returned ${response.status}`);
        }
        const data = await response.json();
        const elements = data.elements || [];
        const batch = db.batch();
        let zoneCount = 0;
        for (const el of elements) {
            // Firestore batch limit is 500. We'll cap at 400 to be safe.
            if (zoneCount >= 400)
                break;
            const name = ((_a = el.tags) === null || _a === void 0 ? void 0 : _a.name) || ((_b = el.tags) === null || _b === void 0 ? void 0 : _b.religion) || 'Sacred Space';
            // We use '🙏' universally
            const icon = '🙏';
            const zoneId = `sacred-osm-${el.id}`;
            const zoneDoc = db.collection('zones').doc(zoneId);
            let type = 'point';
            let center;
            let radius;
            let boundary;
            if (el.type === 'node') {
                type = 'point';
                center = { lat: el.lat, lng: el.lon }; // OSM uses lon, we use lng
                radius = 20; // 20m buffer fallback
            }
            else if (el.type === 'way' && el.geometry) {
                type = 'polygon';
                boundary = el.geometry.map((g) => ({ lat: g.lat, lng: g.lon }));
            }
            else if (el.type === 'relation' && el.members) {
                // Find outer ways
                const outerMembers = el.members.filter((m) => m.role === 'outer' && m.geometry);
                if (outerMembers.length > 0) {
                    type = 'polygon';
                    boundary = [];
                    for (const m of outerMembers) {
                        boundary.push(...m.geometry.map((g) => ({ lat: g.lat, lng: g.lon })));
                    }
                }
            }
            // Skip if no geometry parsed
            if (type === 'point' && center) {
                batch.set(zoneDoc, {
                    id: zoneId,
                    name,
                    category: 'sacred',
                    type: 'point',
                    center: { lat: center.lat, lng: center.lng },
                    radius,
                    isPermanent: true,
                    isActive: true,
                    metadata: { icon, description: `A sacred space from OpenStreetMap` }
                }, { merge: true });
                zoneCount++;
            }
            else if (type === 'polygon' && boundary && boundary.length > 2) {
                batch.set(zoneDoc, {
                    id: zoneId,
                    name,
                    category: 'sacred',
                    type: 'polygon',
                    boundary,
                    isPermanent: true,
                    isActive: true,
                    metadata: { icon, description: `A sacred footprint from OpenStreetMap` }
                }, { merge: true });
                zoneCount++;
            }
        }
        await batch.commit();
        // 5. Update region status
        await regionRef.set({
            status: 'complete',
            zoneCount,
            scannedAt: Date.now(),
            startedAt
        });
        console.log(`[SacredZones] Seeded ${zoneCount} zones for region ${geohash5}`);
        return { success: true, zoneCount };
    }
    catch (e) {
        console.error(`[SacredZones] Error scanning ${geohash5}:`, e);
        await regionRef.set({
            status: 'failed',
            error: e.message || 'Unknown error',
            scannedAt: Date.now()
        }, { merge: true });
        throw new functions.https.HttpsError('internal', 'Overpass API request failed', e.message);
    }
});
//# sourceMappingURL=sacredZones.js.map