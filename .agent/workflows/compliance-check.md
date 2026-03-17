---
description: Audit the app against iOS App Store and Google Play compliance requirements
---

# Compliance Check

Audit the current implementation for app store compliance gaps.

## Steps

1. Read the compliance agent context:
   ```
   .agent/compliance_native_agent.md
   ```

2. Check privacy and disclosure requirements:
   - Search for location permission request code:
     ```bash
     # turbo
     grep -rn "geolocation\|watchPosition\|getCurrentPosition\|Geolocation" src/ --include="*.ts" --include="*.tsx"
     ```
   - Verify a pre-permission disclosure screen exists before location is requested
   - Check for a privacy policy link accessible in-app

3. Check Firestore security rules for compliance:
   ```bash
   # turbo
   cat firestore.rules
   ```
   - Verify rules enforce ownership (can't modify other users' data)
   - Verify rank changes are server-only
   - Flag any overly permissive rules (e.g. `allow write: if request.auth != null` without further checks)

4. Check data handling:
   - Search for user data collection points:
     ```bash
     # turbo
     grep -rn "ownerId\|explorerName\|lastClaimLat\|lastClaimLng\|lastSeen\|currentGridKey" src/lib/ --include="*.ts"
     ```
   - Verify data deletion capability exists (account deletion)
   - Check if data retention policies are documented

5. Check payment/monetization compliance:
   - Review IAP implementation:
     ```bash
     # turbo
     cat src/lib/iapService.ts
     ```
   - Verify platform IAP is used for digital goods on native (not Stripe)
   - Check for price transparency and no hidden costs

6. Check age verification:
   - Search for any age gates or COPPA compliance:
     ```bash
     # turbo
     grep -rn "age\|minor\|child\|coppa\|parental" src/ --include="*.ts" --include="*.tsx" -i
     ```

7. Check Capacitor/native configuration:
   - Review privacy manifest and permissions:
     ```bash
     # turbo
     cat capacitor.config.ts 2>/dev/null || cat capacitor.config.json 2>/dev/null
     ```
   - Check iOS Info.plist for location usage descriptions
   - Check Android manifest for permissions

8. Produce a compliance report:
   - ⛔ **Critical** — App rejection guaranteed
   - ⚠️ **Warning** — May cause issues during review
   - ✅ **Compliant** — Meets requirements

9. For each gap, include:
   - Which guideline is violated (link if possible)
   - Current implementation status
   - Recommended fix with estimated effort (hours/days)
