---
description: Calculate current Firestore costs and revenue projections at a given DAU
---

# Cost Analysis

Calculate infrastructure costs and revenue potential at a specified daily active user (DAU) count.

## Steps

1. Read the monetization agent context:
   ```
   .agent/monetization_agent.md
   ```

2. Count current Firestore operations per user session by scanning the code:
   ```bash
   # turbo
   grep -rn "onSnapshot\|getDocs\|getDoc\|getCountFromServer" src/lib/ --include="*.ts" -c
   ```
   ```bash
   # turbo
   grep -rn "setDoc\|updateDoc\|deleteDoc\|writeBatch\|runTransaction" src/lib/ --include="*.ts" -c
   ```

3. Estimate reads per user session:
   - **Tile loading**: Geohash-scoped queries (~500 tiles per query, ~3 queries per session)
   - **Player listener**: 1 `onSnapshot` (continuous)
   - **Territory listener**: 1 `onSnapshot` (continuous)
   - **Stats verification**: 2 aggregation queries (once per mount)
   - **TileStorage sync**: 0-1 full query (only on count mismatch)
   - **Offers listener**: 1 `onSnapshot` (continuous)
   - **Buyer name lookups**: N `getDoc` calls (one per unique buyer)
   - **Leaderboard**: 1 Cloud Function call (cached 5 min server-side)

4. Estimate writes per user session:
   - **Tile claims**: ~10 claims × 1 `setDoc` + 1 `updateDoc` = 20 writes
   - **Territory writes**: ~1 `setDoc` per capture
   - **Presence updates**: ~10 `updateDoc` (throttled by location changes)
   - **Profile updates**: ~0-1 per session

5. Calculate costs using current Firebase pricing:
   ```
   Reads:  $0.30 per million
   Writes: $0.90 per million
   Storage: $0.18 per GiB/month
   ```

6. Project costs at the user-specified DAU:
   ```
   Daily Cost = (Total Reads × $0.0000003) + (Total Writes × $0.0000009)
   Monthly Cost = Daily Cost × 30
   ```

7. Calculate revenue potential:
   - ARPU benchmarks: $5-10/month for location-based games
   - Conversion rate: 2-5% paying users
   - Revenue sources: IAP, referral-driven growth, future ads/partnerships

8. Present results as a table:
   | Metric | Value |
   |--------|-------|
   | Daily Reads | X |
   | Daily Writes | X |
   | Daily Cost | $X |
   | Monthly Cost | $X |
   | Projected Revenue | $X |
   | Margin | X% |

9. Identify top 3 cost optimization opportunities, ranked by savings potential.
