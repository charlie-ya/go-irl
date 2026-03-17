# Speed Detection - Testing Guide

## Overview

Speed detection has been implemented to prevent excessive database queries when users are in vehicles. The system uses a **5 km/h threshold** with a **25-second consistency window** to filter out GPS anomalies.

## How It Works

### 1. Position Tracking
- GPS positions are tracked with timestamps
- History maintains positions from the last ~37 seconds
- Positions must be at least 2 seconds apart to avoid noise

### 2. Speed Calculation
- Speed is calculated between consecutive positions using Haversine formula
- Movements less than 3 meters are ignored (GPS noise)
- Average speed is calculated from all recent position pairs

### 3. Consistency Check
- Requires at least 5 position updates within 25 seconds
- Calculates speed for each consecutive pair
- If 70%+ of speeds exceed 5 km/h → user is "moving too fast"
- This prevents false positives from GPS glitches

### 4. Tile Loading Behavior
- **Normal (≤5 km/h):** Tiles load within 200m radius as usual
- **Too Fast (>5 km/h consistently):** Tile loading pauses, existing tiles remain visible
- **Resume:** Automatically resumes when speed drops below threshold

## Testing Scenarios

### ✅ Scenario 1: Walking (Should Work Normally)

**Setup:**
1. Open the app on your phone
2. Walk at normal pace (3-5 km/h)

**Expected Behavior:**
- ✅ Tiles load as you move
- ✅ No warning message appears
- ✅ Game functions normally

**How to Verify:**
- Open browser DevTools → Network tab
- Watch for Firestore requests as you walk
- Should see tile queries when you move >50m

---

### ✅ Scenario 2: Stationary (Should Work Normally)

**Setup:**
1. Open the app while standing still
2. Wait 30 seconds

**Expected Behavior:**
- ✅ Initial tiles load
- ✅ No warning message
- ✅ No additional tile queries (you haven't moved)

---

### ⚠️ Scenario 3: In Vehicle (Should Pause Loading)

**Setup:**
1. Open the app while in a car/bus/train (as passenger!)
2. Vehicle should be moving >10 km/h
3. Wait 25-30 seconds for consistency check

**Expected Behavior:**
- ✅ Initial tiles load (before speed detected)
- ✅ After ~25 seconds, warning banner appears:
  ```
  ⚠️ Moving Too Fast
  Tile loading paused. Slow down to walking speed to play.
  ```
- ✅ No new tile queries in Network tab
- ✅ Existing tiles remain visible on map
- ✅ Map still pans/zooms normally

**How to Verify:**
1. Check console logs for: `⚠️ Pausing tile loading - user moving too fast`
2. Network tab should show no new tile queries
3. Warning banner should be visible at top of screen

---

### ✅ Scenario 4: Vehicle → Walking Transition

**Setup:**
1. Start in a moving vehicle (warning should appear)
2. Vehicle stops and you exit
3. Start walking

**Expected Behavior:**
- ✅ Warning disappears within 10-15 seconds of walking
- ✅ Tile loading resumes automatically
- ✅ New tiles load as you walk

**How to Verify:**
- Warning banner should disappear
- Console log should stop showing pause message
- Network tab should show new tile queries

---

### ⚠️ Scenario 5: GPS Glitch (Should NOT Trigger)

**Setup:**
1. Stand still or walk slowly
2. GPS may occasionally "jump" to wrong location

**Expected Behavior:**
- ✅ Brief speed spike is ignored (consistency check)
- ✅ No warning appears for single GPS jump
- ✅ Tiles continue loading normally

**Why:** The 25-second consistency window requires 70%+ of speeds to be high, so a single GPS glitch won't trigger the pause.

---

## Development Testing (Browser)

Since you can't easily simulate movement in a browser, here's how to test the logic:

### Option 1: Mock Geolocation

Add this to your browser console:

```javascript
// Simulate walking speed
let mockLat = 40.7128;
let mockLng = -74.0060;
const walkingSpeed = 0.00001; // ~1.1m per update

navigator.geolocation.getCurrentPosition = (success) => {
  success({
    coords: {
      latitude: mockLat,
      longitude: mockLng,
      accuracy: 10
    }
  });
  mockLat += walkingSpeed;
};

// Simulate driving speed
const drivingSpeed = 0.0001; // ~11m per update
```

### Option 2: Add Debug UI

Temporarily add to `App.tsx` (after line 106):

```tsx
{import.meta.env.DEV && location.speed !== null && (
  <div className="absolute bottom-24 right-4 z-[2000] bg-slate-800 p-3 rounded text-white text-xs font-mono">
    <div>Speed: {location.speed.toFixed(1)} km/h</div>
    <div>Too fast: {location.isMovingTooFast ? 'YES ⚠️' : 'NO ✅'}</div>
    <div>Lat: {location.lat?.toFixed(6)}</div>
    <div>Lng: {location.lng?.toFixed(6)}</div>
  </div>
)}
```

This will show real-time speed data in development mode.

---

## Configuration Tuning

If you need to adjust the behavior, edit `src/lib/speedDetection.ts`:

```typescript
// Current settings
export const SPEED_THRESHOLD_KMH = 5;           // Walking speed limit
export const CONSISTENCY_WINDOW_MS = 25000;     // 25 seconds
export const MIN_POSITIONS_FOR_CHECK = 5;       // Need 5+ positions
export const MIN_TIME_BETWEEN_POSITIONS = 2000; // 2s between samples
export const MIN_DISTANCE_FOR_SPEED = 3;        // 3m minimum movement
```

**To make it more sensitive (trigger faster):**
- Reduce `CONSISTENCY_WINDOW_MS` to 15000 (15 seconds)
- Reduce `MIN_POSITIONS_FOR_CHECK` to 3

**To make it less sensitive (avoid false positives):**
- Increase `CONSISTENCY_WINDOW_MS` to 30000 (30 seconds)
- Increase `MIN_POSITIONS_FOR_CHECK` to 7

**To allow jogging/cycling:**
- Increase `SPEED_THRESHOLD_KMH` to 10 or 15

---

## Monitoring in Production

### Console Logs

When speed detection activates, you'll see:
```
⚠️ Pausing tile loading - user moving too fast (likely in vehicle)
```

### Analytics (Future Enhancement)

Consider tracking:
- How often users trigger speed limit
- Average speed when triggered
- Duration of "too fast" periods
- Conversion: do users return after slowing down?

---

## Cost Impact

### Before Speed Detection

**User in car for 10 minutes:**
- Geohash cells crossed: ~8-10
- Tiles per cell: ~500
- Total reads: 4,000
- Cost: $0.0012 per incident

**100 users/day:** $0.12/day = $3.60/month

### After Speed Detection

**Same scenario:**
- Initial load: 500 reads
- Subsequent loads: 0 (paused)
- Total reads: 500
- Cost: $0.00015 per incident

**100 users/day:** $0.015/day = $0.45/month

**Savings:** $3.15/month (87.5% reduction)

At 1,000 DAU with 10% vehicle usage: **~$400/year savings**

---

## Troubleshooting

### Warning appears while walking
- **Cause:** GPS accuracy issues or walking very fast
- **Solution:** Increase `SPEED_THRESHOLD_KMH` to 7-8 km/h
- **Or:** Increase `CONSISTENCY_WINDOW_MS` to 30000

### Warning doesn't appear in vehicle
- **Cause:** Not enough position updates or vehicle moving slowly
- **Solution:** Reduce `MIN_POSITIONS_FOR_CHECK` to 3
- **Or:** Reduce `CONSISTENCY_WINDOW_MS` to 15000

### Warning appears and disappears rapidly
- **Cause:** Inconsistent GPS or borderline speed
- **Solution:** Increase consistency threshold from 0.7 to 0.8
- **Edit:** Line 90 in `speedDetection.ts`: `return percentageAbove >= 0.8;`

### Tiles don't resume after slowing down
- **Cause:** Speed still slightly above threshold
- **Check:** Add debug UI to see actual speed
- **Solution:** May need to adjust threshold or add hysteresis (different resume threshold)

---

## Next Steps

1. ✅ Build the app: `npm run build`
2. ✅ Test on mobile device in real-world scenarios
3. ✅ Monitor console logs for speed detection triggers
4. ✅ Adjust thresholds if needed based on testing
5. ⏭️ Consider adding analytics to track usage patterns

---

## Files Modified

- ✅ `src/lib/speedDetection.ts` - New utility module
- ✅ `src/lib/useGeolocation.ts` - Added speed tracking
- ✅ `src/lib/gameState.ts` - Added pause logic
- ✅ `src/App.tsx` - Added warning UI

---

*Speed detection is now active and ready for testing!*
