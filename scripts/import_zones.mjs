import admin from 'firebase-admin';
import { createRequire } from 'module';
import fs from 'fs';

// --- SERVICE ACCOUNT ---
// Usage: node scripts/import_zones.mjs <path-to-service-account.json>
const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
    console.error("❌ Usage: node scripts/import_zones.mjs <path-to-service-account.json>");
    process.exit(1);
}
const require = createRequire(import.meta.url);
const serviceAccount = require(fs.realpathSync(serviceAccountPath));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// --- CONFIG ---
const MD_PATH = "C:/Users/charl/Downloads/reserved_spaces_global.md";
const BBOX_HALF_DEG = 0.25; // ~28km radius around city center

// Multiple Overpass mirrors — rotate on rate limit / timeout
const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
];
let epIdx = 0;

// --- MARKDOWN PARSING ---
function parseMarkdown(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const spaces = [];
    let currentCity = null;

    for (const line of lines) {
        const cityMatch = line.match(/^###\s+(.+?)\s+\(/);
        if (cityMatch) { currentCity = cityMatch[1].trim(); continue; }

        if (line.trim().startsWith('|') && line.includes('**')) {
            const nameMatch = line.match(/\*\*(.+?)\*\*/);
            if (nameMatch && currentCity) {
                spaces.push({ name: nameMatch[1].trim(), city: currentCity });
            }
        }
    }
    return spaces;
}

// --- NOMINATIM (city geocoding, cached) ---
const cityBboxCache = new Map();

async function getCityBbox(city) {
    if (cityBboxCache.has(city)) return cityBboxCache.get(city);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "goIRL-zone-importer/1.0" },
            signal: AbortSignal.timeout(15_000),
        });
        const results = await res.json();
        if (!results.length) {
            console.warn(`  ⚠️ Nominatim: no result for "${city}"`);
            cityBboxCache.set(city, null);
            return null;
        }
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);
        const bbox = [lat - BBOX_HALF_DEG, lon - BBOX_HALF_DEG, lat + BBOX_HALF_DEG, lon + BBOX_HALF_DEG];
        console.log(`  📍 "${city}" center: ${lat.toFixed(3)},${lon.toFixed(3)} → ±${BBOX_HALF_DEG}°`);
        cityBboxCache.set(city, bbox);
        await sleep(1200); // Nominatim: max 1 req/s
        return bbox;
    } catch (e) {
        console.warn(`  ⚠️ Nominatim error for "${city}": ${e.message}`);
        // Retry once after delay
        await sleep(3000);
        try {
            const res2 = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`, {
                headers: { "User-Agent": "goIRL-zone-importer/1.0" },
                signal: AbortSignal.timeout(15_000),
            });
            const results2 = await res2.json();
            if (results2.length) {
                const lat = parseFloat(results2[0].lat);
                const lon = parseFloat(results2[0].lon);
                const bbox = [lat - BBOX_HALF_DEG, lon - BBOX_HALF_DEG, lat + BBOX_HALF_DEG, lon + BBOX_HALF_DEG];
                cityBboxCache.set(city, bbox);
                await sleep(1200);
                return bbox;
            }
        } catch (_) { }
        cityBboxCache.set(city, null);
        return null;
    }
}

// --- OVERPASS ---
function sanitize(str) {
    return str.replace(/[&()/\\'"/]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildOverpassQuery(nameFilter, s, w, n, e) {
    return `
[out:json][timeout:30][bbox:${s},${w},${n},${e}];
(
  way["leisure"="park"]${nameFilter};
  relation["leisure"="park"]${nameFilter};
  way["leisure"="garden"]${nameFilter};
  relation["leisure"="garden"]${nameFilter};
  way["tourism"="attraction"]${nameFilter};
  relation["tourism"="attraction"]${nameFilter};
  way["historic"]${nameFilter};
  relation["historic"]${nameFilter};
  way["landuse"="recreation_ground"]${nameFilter};
  relation["landuse"="recreation_ground"]${nameFilter};
  way["waterway"]["name"~"${nameFilter.match(/~"([^"]+)"/)?.[1] || ''}",i];
);
out geom;
    `.trim();
}

async function queryOverpass(query) {
    const totalEndpoints = OVERPASS_ENDPOINTS.length;
    for (let i = 0; i < totalEndpoints; i++) {
        const endpoint = OVERPASS_ENDPOINTS[epIdx % totalEndpoints];
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `data=${encodeURIComponent(query)}`,
                signal: AbortSignal.timeout(38_000),
            });

            if (res.status === 429) {
                console.warn(`  ⚠️ Rate limited (429) by ${endpoint} — waiting 45s, switching endpoint`);
                epIdx++;
                await sleep(45_000);
                continue;
            }
            if (res.status === 504 || res.status === 502) {
                console.warn(`  ⚠️ ${res.status} from ${endpoint} — switching endpoint`);
                epIdx++;
                await sleep(2_000);
                continue;
            }
            if (!res.ok) {
                const text = await res.text();
                console.warn(`  ⚠️ HTTP ${res.status} from ${endpoint}: ${text.slice(0, 80)}`);
                epIdx++;
                continue;
            }
            return await res.json();
        } catch (e) {
            console.warn(`  ⚠️ Fetch error from ${endpoint}: ${e.message}`);
            epIdx++;
            await sleep(2_000);
        }
    }
    return null;
}

async function fetchPolygon(name, city) {
    const bbox = await getCityBbox(city);
    if (!bbox) return [];
    const [s, w, n, e] = bbox;
    const safe = sanitize(name);

    // 1. Try exact name match (fast)
    const exactQuery = buildOverpassQuery(`["name"="${safe}"]`, s, w, n, e);
    const exact = await queryOverpass(exactQuery);
    if (exact?.elements?.length) return exact.elements;

    // 2. Fall back to case-insensitive regex (slower but catches partial matches)
    const regexQuery = buildOverpassQuery(`["name"~"${safe}",i]`, s, w, n, e);
    const fuzzy = await queryOverpass(regexQuery);
    if (fuzzy?.elements?.length) {
        console.log(`  🔍 Found via fuzzy match`);
        return fuzzy.elements;
    }

    return [];
}

// --- FIRESTORE ---
function elementToZone(element, name, city) {
    const sanitizeId = s => s.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const id = `res_${sanitizeId(city)}_${sanitizeId(name)}_${element.id}`;
    const points = [];

    if (element.type === 'way' && element.geometry) {
        element.geometry.forEach(pt => points.push({ lat: pt.lat, lng: pt.lon }));
    } else if (element.type === 'relation' && element.members) {
        const outer = element.members.find(m => m.role === 'outer' && m.geometry);
        if (outer) outer.geometry.forEach(pt => points.push({ lat: pt.lat, lng: pt.lon }));
    }

    if (points.length < 3) return null;
    return {
        id, name, category: 'reserved', type: 'polygon',
        boundary: points, isPermanent: false, isActive: true,
        metadata: { city, osmId: element.id, description: "Imported from Global Directory" }
    };
}

// --- HELPERS ---
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- MAIN ---
async function main() {
    console.log("🚀 Starting Import (Firebase Admin SDK + multi-endpoint Overpass)...");

    const spaces = parseMarkdown(MD_PATH);
    console.log(`📋 Found ${spaces.length} spaces to process.\n`);

    let success = 0, skipped = 0;

    for (const space of spaces) {
        console.log(`Processing: ${space.name} (${space.city})...`);

        const elements = await fetchPolygon(space.name, space.city);
        if (!elements.length) {
            console.warn(`  ⚠️ No OSM data found`);
            skipped++;
            await sleep(3000);
            continue;
        }

        let zone = null;
        for (const el of elements) {
            zone = elementToZone(el, space.name, space.city);
            if (zone) break;
        }

        if (zone) {
            await db.collection("zones").doc(zone.id).set(zone);
            console.log(`  ✅ Imported: ${zone.id}`);
            success++;
        } else {
            console.warn(`  ⚠️ Could not extract polygon geometry`);
            skipped++;
        }

        await sleep(3000); // polite delay between requests
    }

    console.log(`\n🎉 Done! Imported: ${success}, Skipped: ${skipped}`);
    process.exit(0);
}

main().catch(console.error);
