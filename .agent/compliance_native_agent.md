---
description: Compliance and Native App Agent - Monitors app store guidelines compliance and researches native app conversion
created: 2026-01-18
last_updated: 2026-01-18
---

# Compliance and Native App Agent

## Purpose
This agent monitors compliance with iOS App Store and Google Play Store guidelines for the goIRL location-based game, and researches native app conversion strategies.

## Responsibilities

### Primary Tasks
1. **App Store Guidelines Compliance**
   - Monitor latest iOS App Store Review Guidelines
   - Monitor latest Google Play Store policies
   - Identify compliance requirements for location-based games
   - Flag potential compliance issues in current implementation
   - Provide recommendations for maintaining compliance

2. **Native App Research** (Future)
   - Research web-to-native conversion approaches
   - Evaluate frameworks (React Native, Flutter, Capacitor, etc.)
   - Assess timelines and resource requirements
   - Document limitations of web app vs native
   - Provide migration strategies

### Current Focus
- Initial compliance audit against latest guidelines
- Preparation of compliance report
- Identification of critical compliance gaps

## Research Areas

### iOS App Store Guidelines
- Location services and privacy requirements
- In-app purchases and monetization policies
- User data collection and privacy policies
- Game mechanics and gambling restrictions
- User-generated content policies
- Performance and stability requirements

### Google Play Store Policies
- Location permissions and usage
- Payment and monetization policies
- User data and privacy requirements
- Content policies for games
- User-generated content guidelines
- Technical quality standards

### Native App Considerations
- Progressive Web App (PWA) limitations
- Native feature requirements (background location, push notifications)
- Performance considerations
- Development and maintenance costs
- Cross-platform strategies

## Status
- **Current Phase**: Initial compliance research and reporting
- **Last Review**: 2026-01-18
- **Next Actions**: Conduct comprehensive guidelines review

---

## Compliance Report - Initial Assessment
**Date**: 2026-01-18  
**App**: goIRL - Location-Based Territory Game  
**Current Status**: Progressive Web App (PWA)

### Executive Summary

This report assesses goIRL's compliance with iOS App Store and Google Play Store guidelines for location-based games. The app is currently deployed as a PWA, which provides some flexibility but also has limitations compared to native apps. Key findings indicate **moderate compliance risk** with several critical areas requiring immediate attention before native app submission.

---

## 📱 Current App Status

### Technology Stack
- **Platform**: Progressive Web App (PWA)
- **Location Services**: Uses browser geolocation API (`navigator.geolocation.watchPosition`)
- **Authentication**: Firebase Google Sign-In
- **Database**: Firebase Firestore
- **Deployment**: Firebase Hosting
- **Core Functionality**: Real-time location tracking for territory capture

### Current Implementation
- ✅ PWA manifest configured
- ✅ Mobile-optimized viewport
- ✅ Standalone display mode
- ⚠️ Location tracking active (continuous via `watchPosition`)
- ❌ No privacy policy visible
- ❌ No location permission disclosure
- ❌ No data safety documentation

---

## 🚨 Critical Compliance Gaps

### 1. **Privacy Policy - CRITICAL** ⛔
**Status**: Missing  
**Risk Level**: HIGH - App rejection guaranteed

**Requirements**:
- **iOS**: Mandatory privacy policy accessible before app download
- **Google Play**: Required in Play Console and linked in-app
- **Must Include**:
  - What location data is collected (precise GPS coordinates)
  - How location data is used (territory capture, gameplay)
  - How long data is retained
  - With whom data is shared (if any)
  - User rights and data deletion procedures
  - Contact information

**Action Required**: Create comprehensive privacy policy immediately

---

### 2. **Location Permission Disclosure - CRITICAL** ⛔
**Status**: Missing  
**Risk Level**: HIGH - Violates both iOS and Google policies

**iOS Requirements**:
- Must provide prominent in-app disclosure BEFORE requesting location permission
- Must explain WHY location is needed
- Must list ALL features using location data
- For background location: Must display warning about background collection

**Google Play Requirements**:
- Prominent in-app disclosure required before permission request
- Must clearly state location data collection
- Must explain purpose (core functionality vs. advertising)
- Background location requires explicit justification

**Current Implementation**: App requests location via browser API without disclosure

**Action Required**: 
1. Create pre-permission disclosure screen
2. Explain territory capture mechanic requires location
3. Clarify that location is only used during active gameplay
4. Add "Learn More" link to privacy policy

---

### 3. **Data Safety Section (Google Play) - CRITICAL** ⛔
**Status**: Not Configured  
**Risk Level**: HIGH - Mandatory for Play Store

**Required Declarations**:
- ✅ Location data collected: Precise location
- ✅ Purpose: App functionality (territory capture)
- ❌ Data sharing: Must declare if shared with third parties
- ❌ Data encryption: Must declare if data encrypted in transit/at rest
- ❌ User data deletion: Must provide deletion mechanism
- ❌ Data retention policy: Must specify retention period

**Action Required**: Complete Data Safety form in Play Console before submission

---

### 4. **Privacy Nutrition Label (iOS) - CRITICAL** ⛔
**Status**: Not Configured  
**Risk Level**: HIGH - Mandatory for App Store

**Required Declarations**:
- Data types collected: Location (precise), User ID, Email
- Data linked to user: Yes
- Data used for tracking: Must declare (currently unclear)
- Third-party data sharing: Must declare Firebase usage

**Action Required**: Complete App Privacy section in App Store Connect

---

### 5. **Privacy Manifest (iOS) - REQUIRED BY APRIL 2026** ⚠️
**Status**: Not Implemented  
**Risk Level**: MEDIUM - Will become critical by April 2026

**Requirements**:
- Starting April 2026: Apps must include Privacy Manifest file
- Must declare all API usage reasons for location access
- Build will fail validation without proper manifest
- Must use iOS 26 SDK or later

**Action Required**: If converting to native iOS app, implement Privacy Manifest

---

### 6. **Age Verification & Youth Privacy - IMPORTANT** ⚠️
**Status**: Not Implemented  
**Risk Level**: MEDIUM - Required if targeting users under 18

**New 2026 Requirements**:
- **Texas, Utah, Louisiana**: App Store Accountability Acts require age verification for users under 18
- **Age Signals API**: Must use platform APIs to receive age information
- **Parental Consent**: Required for users under 13 (COPPA)
- **Data Minimization**: Enhanced protections for minors' data

**Current Status**: No age verification or restrictions

**Recommendation**: 
- Determine target age demographic
- If targeting all ages: Implement age verification
- If 18+: Clearly mark as such in store listings

---

## ✅ Current Compliance Strengths

### What's Working
1. **Core Functionality**: Location use is clearly tied to core gameplay (territory capture)
2. **PWA Implementation**: Proper manifest, mobile optimization
3. **HTTPS**: App served over secure connection
4. **Authentication**: Using established provider (Google/Firebase)

---

## 📊 Platform-Specific Requirements

### iOS App Store Guidelines

#### ✅ Compliant Areas
- Location used for core functionality (not just advertising)
- No autonomous vehicle control
- No emergency services dispatch

#### ⚠️ Areas Requiring Attention
- **Permission Requests**: Must be specific and contextual
- **Background Location**: If implemented, requires strong justification
- **SDK Requirements**: Must use iOS 26 SDK by April 2026
- **Privacy Manifest**: Required by April 2026
- **Kids Category**: If targeting children, additional restrictions apply

#### 📋 Pre-Submission Checklist
- [ ] Privacy policy created and linked
- [ ] In-app location disclosure implemented
- [ ] Privacy Nutrition Label completed in App Store Connect
- [ ] Location permission request includes clear explanation
- [ ] Privacy Manifest implemented (if native app)
- [ ] Tested on iOS devices with location permissions
- [ ] Verified no background location unless justified

---

### Google Play Store Policies

#### ✅ Compliant Areas
- Location for core functionality (allowed)
- No deceptive practices
- Secure authentication

#### ⚠️ Areas Requiring Attention
- **Data Safety Section**: Must be completed before submission
- **Location Permissions**: Must be foreground-only unless justified
- **Privacy Policy**: Must be linked in Play Console
- **Developer Verification**: Required by September 2026 in some regions
- **Prominent Disclosure**: Required before permission request

#### 📋 Pre-Submission Checklist
- [ ] Privacy policy created and linked in Play Console
- [ ] Data Safety section completed
- [ ] In-app disclosure before location permission
- [ ] Location permission limited to foreground (or justify background)
- [ ] Privacy policy accessible in-app
- [ ] Developer verification completed (if in affected regions)
- [ ] Tested permission flows on Android devices

---

## 🔄 PWA vs Native App Considerations

### Current PWA Limitations

#### What PWAs Cannot Do (Relevant to goIRL)
1. **Background Location**: Very limited on iOS, interrupted when screen dims
2. **Push Notifications**: iOS requires home screen installation, limited functionality
3. **App Store Presence**: Cannot be listed in iOS App Store as pure PWA
4. **Hardware Access**: Limited Bluetooth, no NFC on iOS
5. **Performance**: Slower for intensive graphics/computations
6. **Offline Storage**: Limited to 50MB on iOS PWAs
7. **Native UI**: Cannot fully match platform-specific design guidelines
8. **Monetization**: Cannot use native in-app purchase systems

#### PWA Advantages
1. **Single Codebase**: Works on both iOS and Android
2. **No App Store Fees**: Bypass 15-30% commission on transactions
3. **Instant Updates**: No app store review for updates
4. **Lower Development Cost**: No need for separate iOS/Android teams
5. **Web-to-App Billing**: Can use Stripe (~3% fees) instead of app store billing

### Native App Advantages

#### iOS Native
- Full background location access (with justification)
- Better performance for graphics-intensive features
- Native push notifications
- App Store discoverability
- Full hardware API access
- Better offline capabilities

#### Android Native
- Similar benefits to iOS
- More flexible than iOS for PWAs (but native still better)
- Better background processing
- Play Store discoverability

---

## 💰 Monetization Compliance (2026)

### In-App Purchases & Payments

#### iOS (Apple)
**Current Regulations**:
- **EU & Japan**: Alternative payment systems allowed due to DMA/MSCA
- **Fees**: 15-21% for alternative payments, 15-30% for Apple IAP
- **Web Linking**: Can link to external website for purchases (15% fee on sales)
- **Core Technology Commission**: 5% fee in some cases

**Restrictions**:
- Pure PWAs cannot use native IAP
- Must comply with regional payment regulations
- Kids category apps: Blocked from external payments in Japan

#### Google Play (Android)
**Current Regulations**:
- **User Choice Billing**: Available in EU, US, Japan
- **Alternative Billing**: Developers can offer alternative payment methods
- **Fees**: Service fees still apply even with alternative billing
- **External Links**: Allowed in US (no prohibition)

**Restrictions**:
- Must comply with DMA requirements
- Potential EU fines if not fully compliant

#### Recommended Strategy for goIRL
1. **Short-term (PWA)**: Use web-to-app billing with Stripe (~3% fees)
2. **Long-term (Native)**: Implement hybrid approach:
   - Offer in-app purchases via platform billing (for convenience)
   - Provide web-based purchase option (lower fees)
   - Clearly communicate pricing differences if allowed

---

## 🎯 Immediate Action Items (Priority Order)

### 🔴 CRITICAL - Must Complete Before Any App Store Submission

1. **Create Privacy Policy** (1-2 days)
   - Hire legal counsel or use template service (iubenda, Termly)
   - Cover all data collection, usage, sharing, retention
   - Make accessible at public URL
   - Link from app and store listings

2. **Implement Location Permission Disclosure** (1 day)
   - Create pre-permission modal/screen
   - Explain territory capture requires location
   - Add "Learn More" link to privacy policy
   - Test on both iOS and Android browsers

3. **Configure Data Safety (Google Play)** (2-3 hours)
   - Complete Data Safety form in Play Console
   - Declare precise location collection
   - Specify purpose: App functionality
   - Declare Firebase usage and data sharing

4. **Configure Privacy Nutrition Label (iOS)** (2-3 hours)
   - Complete App Privacy in App Store Connect
   - Declare location, email, user ID collection
   - Specify data linking and tracking practices

### 🟡 HIGH PRIORITY - Complete Within 30 Days

5. **Implement User Data Deletion** (2-3 days)
   - Add account deletion feature
   - Delete all user data from Firestore
   - Provide confirmation to user
   - Document in privacy policy

6. **Review Firebase Data Sharing** (1 day)
   - Audit what data Firebase collects
   - Review Firebase's privacy policies
   - Declare in Data Safety and Privacy Label

7. **Age Verification Assessment** (1 day)
   - Determine target age demographic
   - Implement age gate if targeting minors
   - Add age restrictions to store listings if 18+

### 🟢 MEDIUM PRIORITY - Complete Within 60 Days

8. **Prepare for Native Conversion** (Research phase)
   - Evaluate React Native, Flutter, or Capacitor
   - Estimate development timeline
   - Calculate cost-benefit vs. PWA
   - Plan migration strategy

9. **Privacy Manifest (iOS Native)** (If converting)
   - Implement Privacy Manifest file
   - Declare API usage reasons
   - Update to iOS 26 SDK

10. **Developer Verification** (If applicable)
    - Complete verification in affected regions
    - Provide required documentation

---

## 🔮 Future Considerations

### Native App Conversion Timeline

**Recommended Approach**: Phased Migration

#### Phase 1: PWA Optimization (Current - 3 months)
- Fix all compliance issues
- Optimize user experience
- Gather user feedback
- Test monetization strategies

#### Phase 2: Hybrid Approach (3-6 months)
- Use Capacitor or similar to wrap PWA
- Gain app store presence
- Access some native features
- Lower development cost than full native

#### Phase 3: Full Native (6-12 months) - If Justified
- Evaluate user growth and revenue
- Assess need for advanced features (background location, push notifications)
- Build separate iOS/Android apps if ROI justifies cost

### Technology Recommendations

**For Hybrid/Native Conversion**:
1. **Capacitor** (Recommended for goIRL)
   - Wraps existing web app
   - Access to native APIs
   - Minimal code changes
   - Good for location-based apps

2. **React Native**
   - Better performance
   - More native feel
   - Larger ecosystem
   - Requires significant rewrite

3. **Flutter**
   - Excellent performance
   - Beautiful UI
   - Single codebase
   - Complete rewrite required

---

## 📈 Compliance Monitoring

### Ongoing Requirements

**Monthly**:
- Review app store policy updates
- Monitor user privacy complaints
- Audit data collection practices

**Quarterly**:
- Update privacy policy if features change
- Review Firebase data handling
- Test permission flows on new OS versions

**Annually**:
- Legal review of privacy practices
- Compliance audit
- Update Data Safety and Privacy Labels

### Key Dates to Watch

- **April 2026**: iOS 26 SDK requirement takes effect
- **September 2026**: Google developer verification (select regions)
- **2027**: Global Google developer verification rollout
- **Ongoing**: GDPR, CCPA, and state privacy law updates

---

## 🎓 Resources

### Official Guidelines
- [iOS App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Developer Policy Center](https://play.google.com/about/developer-content-policy/)
- [Apple Privacy Requirements](https://developer.apple.com/app-store/user-privacy-and-data-use/)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)

### Privacy Policy Tools
- iubenda (privacy policy generator)
- Termly (compliance platform)
- PrivacyPolicies.com

### Legal Resources
- Consult with app privacy attorney
- IAPP (International Association of Privacy Professionals)

---

## ✅ Conclusion

**Current Compliance Status**: ⚠️ **NOT READY FOR APP STORE SUBMISSION**

**Critical Blockers**: 
1. Missing privacy policy
2. No location permission disclosure
3. Data Safety section not configured
4. Privacy Nutrition Label not configured

**Estimated Time to Compliance**: 1-2 weeks with focused effort

**Recommendation**: 
1. Address all critical items before any native app submission
2. Continue as PWA while fixing compliance issues
3. Evaluate native conversion after achieving user traction
4. Prioritize user privacy and transparency in all features

**Next Steps**:
1. Create privacy policy (hire legal help)
2. Implement location disclosure screen
3. Complete platform-specific privacy declarations
4. Test compliance on both iOS and Android
5. Consider hybrid approach (Capacitor) for app store presence

---

*This report will be updated as guidelines evolve and the app develops new features.*
