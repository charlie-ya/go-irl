# Tile Caching Implementation Report

## Status
**Completed**. Client-side caching using IndexedDB has been implemented.

## Changes
1.  **New Service**: `src/lib/tileStorage.ts` - Manages a local `IndexedDB` database to store user tiles.
2.  **Updated Logic**: `src/lib/gameState.ts` - Modified `claimSquare` and `buySquare` to:
    -   Load tiles from local storage on startup at sync with Firestore if counts different.
    -   Read from local storage when calculating territories (replacing the expensive `getDocs` query).
    -   Write to local storage immediately upon successful claim/purchase.

## Estimated Savings

### The Math
*   **Old Behavior**: Every claim fetched ALL tiles owned by the user.
    *   Cost = `N` reads per claim (where `N` is tiles owned).
*   **New Behavior**: Claims read from local cache.
    *   Cost = `0` reads per claim (only writes).

### Scenario: Power User (5,000 Tiles owned)
*   **Activity**: Claims 20 new squares in a day.
*   **Without Cache**: 20 * 5,000 = **100,000 reads**.
*   **With Cache**: **0 reads** (only writes).
*   **Savings**: 100% of read costs for claims.

### Financial Impact (1,000 Daily Active Users)
Assuming average portfolio of 500 tiles and 10 claims/day:
*   Old: 1,000 users * 10 claims * 500 reads = **5,000,000 reads/day**.
*   Cost (~$0.60 per 1M reads): **$3.00/day** ($90/month).
*   **New Cost**: **$0.00** for these reads.

**Verdict**: This is a critical optimization for scaling. Without it, your most engaged users become your most expensive liability.

## Pitfalls & Mitigations

### 1. Multiple Devices
*   **Risk**: User claims on Tablet, then opens Phone. Phone has old cache.
*   **Mitigation**: Implemented a "Count Mismatch" check. On load, if `local_tile_count != firestore_total_claims`, the app forces a full re-sync.
    *   *Note*: This relies on `totalClaims` being accurate.

### 2. Cache Clearing
*   **Risk**: User clears browser data or uninstall/reinstalls app.
*   **Result**: Local cache is empty (`count = 0`).
*   **Handling**: The sync logic detects `0 != totalClaims` and fetches everything from Firestore. Safe.

### 3. Sell/Loss of Tiles
*   **Risk**: If you implement "losing" territory (e.g., decay or attacks), you must ensure `totalClaims` in Firestore is updated atomically.
*   **Current State**: Your logic correctly decrements `totalClaims` on loss. The sync logic will handle it on next session.

### 4. Storage Limits
*   **Risk**: IndexedDB quota.
*   **Reality**: Text data is tiny. 100,000 tiles w/ metadata is ~20-50MB. Modern browsers allow gigabytes. This is safe.
