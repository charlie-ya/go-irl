---
description: Run a full code efficiency audit across the codebase
---

# Run Efficiency Audit

Scan the entire codebase for waste, cost inefficiency, and performance issues.

## Steps

1. Read the efficiency agent context:
   ```
   .agent/efficiency_agent.md
   ```

2. Scan all TypeScript source files for Firestore operations:
   ```bash
   # turbo
   grep -rn "getDocs\|getDoc\|onSnapshot\|setDoc\|updateDoc\|deleteDoc\|addDoc\|writeBatch\|runTransaction\|getCountFromServer" src/lib/ src/components/ functions/src/ --include="*.ts" --include="*.tsx"
   ```

3. For each Firestore operation found, check against the efficiency checklist:
   - Is the query bounded (has `where`, `limit`, or geohash scoping)?
   - Is the listener properly unsubscribed in a cleanup function?
   - Are reads happening inside loops?
   - Are writes batched where possible?
   - Is the value compared before writing (no redundant writes)?

4. Scan for React performance issues:
   ```bash
   # turbo
   grep -rn "useEffect\|useMemo\|useCallback\|React.memo\|useState" src/components/ --include="*.tsx"
   ```

5. Check for large/expensive imports:
   ```bash
   # turbo
   grep -rn "@turf/turf\|lodash[^-]" src/ --include="*.ts" --include="*.tsx"
   ```

6. Check bundle dependencies for bloat:
   ```bash
   # turbo
   cat package.json | grep -E "dependencies" -A 50
   ```

7. Review `gameState.ts` specifically for:
   - Monolithic state causing cascade re-renders
   - Effects with broad dependency arrays
   - Listener duplication on re-renders

8. Produce a report with findings categorized as:
   - 🔴 **Critical** — Costs real money or causes user-visible lag
   - 🟡 **Warning** — Scales poorly at higher DAU
   - 🟢 **Info** — Nice-to-have improvement

9. For each finding, include:
   - File and line number
   - Description of the waste
   - Estimated cost impact (reads/writes saved, bundle KB reduced)
   - Recommended fix with code example
