# Roamin' Empire: Costs & Monetization Reality Check

> **Status:** DRAFT (v2 - Expanded with Scaling Projections)
> **Last Updated:** 2026-01-28
> **Author:** Strategy & Reality Agent

## 1. The "Hidden" Infrastructure Costs

### 🗺️ Map Tiles (The Silent Budget Killer)
**Current Status:** Using OpenStreetMap (OSM) standard tile servers.
**Strategy Agent Warning:** 🚨 **CRITICAL RISK**

*   **The Reality:** Leaflet (the library) is free. The *images* it loads (the tiles) are not free to host.
*   **The Risk:** The default OSM servers (`tile.openstreetmap.org`) are run by volunteers on donated hardware. They **strictly prohibit** heavy usage or commercial apps.
    *   *Consequence:* If you launch with this, you will be blocked. Your users will see grey squares instead of a map.
*   **The Requirement:** You MUST switch to a commercial tile provider before public launch.

#### Cost Estimates (Mapbox Web API via Leaflet)
*Since you are using `react-leaflet`, Mapbox bills this as "Web Maps" (Map Loads), NOT "Mobile SDK" (MAUs).*

*   **Pricing Model:** Pay per "Map Load" (1 load = initializing the map, up to 16 tiles).
*   **Free Tier:** 50,000 loads / month.
*   **Overage:** ~$5.00 per 1,000 loads.
*   **Aggressive Caching Impact:** Reducing re-loads by 30% (optimistic).

---

### 🔥 Database (Firestore)
**Current Status:** Firebase Firestore (NoSQL).
**Strategy Agent Warning:** ⚠️ **SCALABILITY CAUTION**

*   **Using Geohashing:** Reduces reads by ~90% compared to querying "all".
*   **Cost Reality:**
    *   **Reads:** $0.36 per 1 million reads.
    *   **Writes:** $1.08 per 1 million writes.

---

## 2. Scaling Projections (The "Success Disaster" Scenario)

*Assumptions:*
*   **Activity:** Average User plays **2 sessions/day** (60 sessions/month).
*   **Data Usage:** 50 reads + 5 writes per session (optimized).
*   **Map Usage:** 1 Map Load per session (aggressive caching keeps this low).

### Scenario A: 1,000 Monthly Active Users (Hobby App)
*   **Map Loads:** 60,000 loads.
    *   Free Tier: Covers 50,000.
    *   Billable: 10,000 loads @ $5/1k = **$50.00**
*   **Database:**
    *   Reads: 3M reads = ~$1.08
    *   Writes: 300k writes = ~$0.32
    *   Total DB: **~$1.40**
*   **Total Monthly Infrastructure:** **~$51.40**

### Scenario B: 10,000 Monthly Active Users (Indie Success)
*   **Map Loads:** 600,000 loads.
    *   Billable: 550,000 loads @ $5/1k = **$2,750.00** 🚨
*   **Database:**
    *   Reads: 30M reads = ~$10.80
    *   Writes: 3M writes = ~$3.24
    *   Total DB: **~$14.04**
*   **Total Monthly Infrastructure:** **~$2,764.00**

### Scenario C: 100,000 Monthly Active Users (Viral Hit)
*   **Map Loads:** 6,000,000 loads.
    *   Billable: 5.95M loads = **$29,750.00** 💀
*   **Database:**
    *   Total DB: **~$140.00**
*   **Total Monthly Infrastructure:** **~$29,890.00**

> **Strategy Agent Insight:** The Mapbox "Web" pricing kills you at scale.
> **Fix:** Switch your implementation from `react-leaflet` to the **Mapbox Maps Mobile SDK** (Native).
> **Native SDK Pricing:** Charges by **MAU** (Monthly User), not loads.
> *   Scenario C (Native SDK): 100k MAUs. First 50k Free. Next 50k @ $0.004/user = **$200.00 total.**
> *   **Difference:** $29,750 vs $200. This usage of Native SDK is critical.

---

## 3. Monetization Analysis (Selling Coins)

*Assumptions:*
*   **Game Economy:** Claims cost 1 coin. Users burn 5 coins/session.
*   **Burn Rate:** 10 coins/day -> 300 coins/month.
*   **Free Stock:** User starts with 100 coins (lasts ~10 days).
*   **Conversion Rate:** 3% of users buy coins.
*   **Pack:** $0.99 for 100 coins (Net profit ~$0.70 after store fees).

### Revenue Projection (At 10,000 MAUs)
*   **Paying Users:** 300 users (3%).
*   **Volume:** Each paying user buys 2 packs/month to keep playing ($2.00 spend).
*   **Gross Revenue:** $600.00/month.
*   **Net Revenue (after Apple/Google 30%):** **$420.00/month.**

### 🛑 Profitability Reality Check

| Metric | Web Map (Leaflet) | Native SDK Map |
| :--- | :--- | :--- |
| **Infra Cost (10k Users)** | $2,764.00 | ~$40.00 |
| **Net Revenue** | $420.00 | $420.00 |
| **Net Profit/Loss** | **-$2,344.00 (LOSS)** | **+$380.00 (PROFIT)** |

## 4. Mitigation & Creative Strategy Analysis

### A. "Local Maps" Caching Reality
*   **The Hope:** Maps are cached on the phone, so we don't pay.
*   **The Reality:**
    *   **Browser/Web View:** Browsers have aggressive cache limits (often ~50MB total for everything). They evict map tiles ruthlessly. You cannot rely on this for cost savings.
    *   **Native SDK:** Native Maps (Mapbox/Google SDKs) have dedicated, large, persistent caches (often 500MB+). This is another reason the Native SDK is superior for costs.
*   **Strategic Verdict:** Do not count on browser caching to save your budget. It's a false friend.

#### A.1 The "Other Apps Cache" Myth (Sandboxing)
*   **User Question:** "Can we access map data cached by Google Maps or other apps on the user's phone?"
*   **The Answer:** **NO.**
    *   **Security Sandboxing:** iOS and Android strictly isolate apps. Your app cannot see, read, or access data from other apps (like Google Maps). That would be a massive privacy vulnerability.
    *   **The Exception (Native SDKs):** If you use the **Apple MapKit** (iOS) or **Google Maps SDK** (Android), you *are* using the system's shared map engine. While you don't "steal" their cache, the OS handles data loading very efficiently at the system level. This is often free (MapKit) or very cheap (Google Mobile SDK) because the OS manufacturer absorbs the data cost to add value to their phone.
    *   **Web/Leaflet:** Has 0% access to system maps. It downloads everything from scratch.

### B. "Building the Need" (Improving >3% conversion)
*   **The Strategy:** Make coins essential to the core loop.
*   **Tactics:**
    *   **Territory Decay:** Tiles "rust" or "fade" after 7 days unless refreshed (costing 1 coin). This creates a "maintenance bill" for large empire owners (`Building the need`).
    *   **Defense:** Pay coins to "fortify" a tile, making it cost 2x for an enemy to steal.
    *   **Streak Bonus:** Daily login = 5 coins. Consecutive days = multiplier. Breaks the habit of "hoarding" and encourages daily play.

### C. "No-Map Mode" (The Strategic Pivot) 💡
*   **The Idea:** Turn off the map when coins are low, or play primarily without it.
*   **Why it works:**
    *   **"Fog of War" as a Mechanic:** Default view is GRID ONLY (No underlying street map). This costs **$0** in map data.
    *   **"Scout Mode":** Player pays 1 coin (or watches an ad) to "reveal satellite/street stats" for 5 minutes.
    *   **Warning System:** "Low Signal! Map feed lost. Insert Coin to restore satellite link." -> Gamifies the budget constraint.
*   **Financial Impact:** If users play 90% of the time in "Grid/Fog Mode" and only 10% in "Map Mode", you slash infrastructure costs by 90% immediately.

### D. The "Web-First" Launch (MVP Route)
*   **User Question:** "Can we start with Mapbox Web (Leaflet) and switch to Native SDK later?"
*   **Strategy Agent Verdict:** **YES, this is a valid "Lean Startup" move.**

| Feature | **Web-First (Leaflet)** | **Native SDK (Mapbox/Google)** |
| :--- | :--- | :--- |
| **Dev Effort** | **Zero (Already Built)** ✅ | High (Rewrite Map components) |
| **Speed to Market** | **Immediate** ✅ | Weeks of delay |
| **Cost (Low Scale)** | **Free** (<50k loads) ✅ | Free (<50k MAUs) ✅ |
| **Cost (High Scale)** | **Dangerous** ($5/1k loads) ❌ | **Cheap** (MAU pricing) ✅ |
| **Performance** | OK (Browser Canvas) | **Butter Smooth** (Metal/Vulkan) |
| **Caching** | Weak (Browser limits) | **Strong** (Access to file system) |

**The Strategy:**
1.  **Launch with Web/Leaflet:** Use the free 50,000 loads/month.
2.  **Monitor Closely:** Set a "Kill Switch" or alert at 40,000 loads.
3.  **Pivot at Success:** If you hit 40k loads, you have "product-market fit." **Then** you spend the money/time to rewrite for Native SDK.
    *   *Why:* Don't optimize for 100k users if you don't use 100 users yet.

---

## 5. Final Strategic Recommendations

1.  **Immediate Action (MVP):** Register for Mapbox, get an API key, and swap it into `MapBoard.tsx`. Stick with `react-leaflet` to launch fast.
2.  **The "Success Trap" Alarm:** Set a billing alert at $20. If you hit it, successful! Now you *must* migrate to Native SDK immediately.
3.  **Monetization:** Implement the "Grid Mode" / "No Map" toggle. It's the best way to save costs on the Web version while adding a cool gameplay mechanic.

*Report End.*
