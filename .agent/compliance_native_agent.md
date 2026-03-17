---
description: Compliance and Native App Agent - Monitors app store guidelines compliance and native app readiness
created: 2026-01-18
last_updated: 2026-03-13
---

# Compliance & Native App Agent

## Role
This agent monitors compliance with iOS App Store and Google Play Store guidelines for the Roamin' Empire location-based game, and tracks native app readiness via Capacitor.

## Current App Status (March 2026)

### Technology Stack
- **Platform:** Vite + React 19 SPA, wrapped with Capacitor 6
- **Native:** iOS (Capacitor) + Android (Capacitor) — build pipeline set up
- **Location Services:** Capacitor Geolocation plugin (`@capacitor/geolocation`)
- **Authentication:** Firebase Google Sign-In + Capacitor Google Auth plugin
- **Database:** Firebase Firestore (7 collections)
- **Map:** Mapbox GL via react-map-gl
- **Deployment:** Firebase Hosting (web), Xcode (iOS), Android Studio (Android)

### Native Plugins Installed
| Plugin | Package | Purpose |
|:---|:---|:---|
| Core | `@capacitor/core` v6 | Capacitor runtime |
| Android | `@capacitor/android` v6 | Android native shell |
| iOS | `@capacitor/ios` v6.2.1 | iOS native shell |
| Geolocation | `@capacitor/geolocation` v6 | GPS access |
| Filesystem | `@capacitor/filesystem` v6 | File operations |
| Share | `@capacitor/share` v6 | Native sharing |
| Text Zoom | `@capacitor/text-zoom` v6 | Accessibility |
| Google Auth | `@codetrix-studio/capacitor-google-auth` | Native Google Sign-In |

### Compliance Status Overview

| Area | Status | Risk |
|:---|:---|:---|
| Privacy Policy | ❌ Missing | ⛔ Critical |
| Location Disclosure | ⚠️ Partial (`SafetyWarning.tsx`) | ⛔ Critical |
| Data Safety (Google Play) | ❌ Not configured | ⛔ Critical |
| Privacy Nutrition Label (iOS) | ❌ Not configured | ⛔ Critical |
| Privacy Manifest (iOS) | ❌ Not implemented | ⚠️ Required April 2026 |
| Account Deletion | ❌ Not implemented | ⚠️ Required |
| Age Verification | ❌ Not implemented | ⚠️ Depends on target audience |
| IAP Compliance | ⚠️ Scaffold only | ⚠️ Must use platform IAP for digital goods |

## Firestore Security Rules Analysis

### Current Rules (`firestore.rules`)

| Collection | Read | Write | Issues |
|:---|:---|:---|:---|
| `players` | ✅ Public | ✅ Owner-only with rank lock | Rank changes blocked client-side ✅ |
| `players` (other) | ✅ Public | ⚠️ Trade updates allowed | Fields locked but pattern is complex |
| `tiles` | ✅ Public | ✅ Auth + owner for update/delete | Create only checks auth, not position ⚠️ |
| `offers` | ✅ Auth only | ⚠️ Buyer or seller can update | Should be more restrictive on status changes |
| `captured` | ✅ Public | ⚠️ Any auth user can write | Should be owner-only or Cloud Function |
| `zones` | ✅ Public | ⚠️ Any auth user can write | Marked "temporary" — must restrict to admin |
| `referrals` | ✅ Auth only | ⚠️ Any auth user can create/update | Self-referral exploit possible |
| `leaderboards` | ✅ Public | ✅ Admin SDK only | Correct — Cloud Functions write |

### Critical Security Gaps
1. **`captured` collection:** Any authenticated user can write to any territory doc. Should require `ownerId == request.auth.uid` or move writes to a Cloud Function.
2. **`zones` collection:** Any authenticated user can create/delete exclusion zones. Must be restricted to admin-only writes.
3. **`referrals` collection:** Any authenticated user can create/update any referral doc. No validation that `referrerId != refereeId`.
4. **`tiles` create:** No server-side position validation. Client checks are bypassable.

## Compliance Checklists

### iOS App Store Pre-Submission
- [ ] Privacy policy created and linked (public URL)
- [ ] In-app location disclosure before permission request
- [ ] Privacy Nutrition Label completed in App Store Connect
- [ ] Privacy Manifest file implemented (required April 2026)
- [ ] `NSLocationWhenInUseUsageDescription` in Info.plist
- [ ] Account deletion feature implemented
- [ ] IAP uses StoreKit (not Stripe) for digital goods
- [ ] Tested on iOS devices with permission flows
- [ ] No background location unless justified and declared

### Google Play Pre-Submission
- [ ] Privacy policy linked in Play Console
- [ ] Data Safety section completed
- [ ] Prominent in-app disclosure before location permission
- [ ] Location permission limited to foreground
- [ ] Account deletion feature implemented
- [ ] IAP uses Google Play Billing (not Stripe) for digital goods
- [ ] Developer verification completed (if required in region)
- [ ] Tested permission flows on Android devices

## How to Use This Agent

### Invoke via Workflow
Use `/compliance-check` for a structured compliance audit.

### Ask About:
- "Are we ready to submit to the App Store?"
- "What Firestore rules need fixing before launch?"
- "Do we need a privacy manifest?"
- "What permissions do we need to declare?"

### Key Dates
- **April 2026:** iOS Privacy Manifest required
- **September 2026:** Google developer verification (select regions)
- **2027:** Global Google developer verification rollout

---

*Last updated: 2026-03-13. Agent ready to audit compliance and track native readiness.*
