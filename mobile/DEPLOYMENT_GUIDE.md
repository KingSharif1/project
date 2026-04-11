# Mobile App Deployment Guide
## Publishing to iOS App Store and Google Play Store

This guide walks you through the complete process of publishing the Fort Worth Transportation mobile app to both iOS App Store and Google Play Store.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [iOS App Store Deployment](#ios-app-store-deployment)
5. [Google Play Store Deployment](#google-play-store-deployment)
6. [Building the Apps](#building-the-apps)
7. [Submitting to Stores](#submitting-to-stores)
8. [Post-Deployment](#post-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- **Expo Account**: Sign up at https://expo.dev
- **Apple Developer Account**: $99/year at https://developer.apple.com
- **Google Play Developer Account**: $25 one-time fee at https://play.google.com/console

### Required Software
- Node.js 18+ installed
- EAS CLI installed globally: `npm install -g eas-cli`
- Git installed and configured

### Required Information
- Production API URL (your backend server domain)
- Google Maps API Key
- App Store Connect credentials
- Google Play Console credentials

---

## Initial Setup

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
cd mobile
eas login
```
Enter your Expo account credentials.

### 3. Configure EAS Project
```bash
eas build:configure
```
This will:
- Create/update `eas.json` (already configured)
- Generate a unique EAS Project ID
- Link your project to your Expo account

### 4. Update App Configuration
After running `eas build:configure`, update these files with the generated IDs:

**mobile/app.config.js:**
```javascript
extra: {
  eas: {
    projectId: "YOUR_GENERATED_EAS_PROJECT_ID" // Replace with actual ID
  }
}
```

**mobile/.env.production:**
```
EAS_PROJECT_ID=YOUR_GENERATED_EAS_PROJECT_ID
```

---

## Environment Configuration

### 1. Configure Production Environment Variables

Edit `mobile/.env.production`:

```env
APP_ENV=production

# Your production backend API URL
API_URL=https://api.yourdomain.com/api/mobile

# Supabase (already configured)
SUPABASE_URL=https://ocjqsnocuqyumoltighi.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Maps API Key (REQUIRED)
GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_GOOGLE_MAPS_API_KEY
```

### 2. Get Google Maps API Key

1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable these APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Geocoding API
   - Directions API
4. Create credentials → API Key
5. Restrict the key to your app's bundle IDs:
   - iOS: `com.fwtransportation.app`
   - Android: `com.fwtransportation.app`

### 3. Deploy Your Backend API

Your backend must be accessible via HTTPS with a valid SSL certificate. Options:
- **AWS EC2/Elastic Beanstalk** with Load Balancer
- **DigitalOcean App Platform**
- **Heroku**
- **Railway**
- **Render**

Update `API_URL` in `.env.production` with your production domain.

---

## iOS App Store Deployment

### Step 1: Apple Developer Account Setup

1. **Enroll in Apple Developer Program**
   - Go to https://developer.apple.com/programs/
   - Pay $99/year enrollment fee
   - Complete enrollment (may take 24-48 hours)

2. **Create App Store Connect Record**
   - Go to https://appstoreconnect.apple.com
   - Click "My Apps" → "+" → "New App"
   - Fill in:
     - **Platform**: iOS
     - **Name**: Fort Worth Transportation
     - **Primary Language**: English (U.S.)
     - **Bundle ID**: `com.fwtransportation.app`
     - **SKU**: `fw-transportation-001`
     - **User Access**: Full Access

3. **Note Your App Information**
   - **App Store Connect App ID**: Found in App Information (10-digit number)
   - **Team ID**: Found in Membership section of developer account

### Step 2: Configure App Metadata

In App Store Connect, fill out:

**App Information:**
- Category: Travel or Business
- Content Rights: Check if you own all rights
- Age Rating: Complete questionnaire (likely 4+)

**Pricing and Availability:**
- Price: Free
- Availability: All countries or select specific

**App Privacy:**
- Data Types Collected:
  - Location (for trip tracking)
  - Contact Info (name, email, phone)
  - User Content (signatures, photos)
- Data Use: App functionality, analytics
- Data Linked to User: Yes

### Step 3: Prepare App Store Assets

Create these assets (use design tools like Figma, Canva, or hire a designer):

**App Icon:**
- 1024x1024 PNG (no transparency, no rounded corners)
- Save as `mobile/assets/icon.png`

**Screenshots (Required for 6.7" iPhone):**
- 1290 x 2796 pixels
- Need 3-10 screenshots showing:
  - Login screen
  - Trip list
  - Trip details with map
  - Messages
  - Profile/settings

**App Preview Video (Optional but recommended):**
- 15-30 seconds
- Show key features

### Step 4: Update eas.json with Apple Credentials

Edit `mobile/eas.json`:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@email.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABC123XYZ"
    }
  }
}
```

---

## Google Play Store Deployment

### Step 1: Google Play Console Setup

1. **Create Developer Account**
   - Go to https://play.google.com/console
   - Pay $25 one-time registration fee
   - Complete account setup

2. **Create New App**
   - Click "Create app"
   - Fill in:
     - **App name**: Fort Worth Transportation
     - **Default language**: English (United States)
     - **App or game**: App
     - **Free or paid**: Free
   - Accept declarations and create

### Step 2: Configure App Details

**Store Listing:**
- **Short description** (80 chars max):
  "Professional NEMT driver app for trip management and real-time tracking"

- **Full description** (4000 chars max):
  ```
  Fort Worth Transportation is the professional driver companion app for NEMT (Non-Emergency Medical Transportation) services.

  KEY FEATURES:
  • Real-time trip assignments and notifications
  • Turn-by-turn navigation with live traffic
  • Digital signature capture
  • Secure messaging with dispatch
  • Trip history and earnings tracking
  • Vehicle and document management
  • Offline capability for rural areas

  DESIGNED FOR DRIVERS:
  Streamlined interface for quick trip acceptance, status updates, and passenger communication. GPS tracking ensures accurate mileage and provides dispatchers with real-time location updates.

  SECURE & COMPLIANT:
  HIPAA-compliant data handling, encrypted communications, and secure authentication with biometric login support.

  Note: This app requires an active driver account with Fort Worth Transportation. Contact your dispatcher for login credentials.
  ```

- **App icon**: 512x512 PNG (same design as iOS icon)

- **Feature graphic**: 1024x500 PNG (banner image)

- **Screenshots**:
  - Phone: 1080 x 1920 to 1080 x 2400 (need 2-8)
  - 7" Tablet: 1200 x 1920 (optional)
  - 10" Tablet: 1600 x 2560 (optional)

- **Category**: Business or Maps & Navigation

- **Contact details**:
  - Email: support@yourdomain.com
  - Phone: Optional
  - Website: https://yourdomain.com

- **Privacy Policy**: Required - host at https://yourdomain.com/privacy

### Step 3: Content Rating

Complete the questionnaire:
- Violence: None
- Sexual Content: None
- Profanity: None
- Controlled Substances: None
- Gambling: None
- User Interaction: Yes (messaging feature)
- Location Sharing: Yes (with users' consent)
- Personal Info Access: Yes (name, email, phone)

Likely rating: **ESRB Everyone** or **PEGI 3**

### Step 4: Create Service Account for Automated Submission

1. **Enable Google Play Developer API**
   - Go to https://console.cloud.google.com
   - Select your project
   - Enable "Google Play Developer API"

2. **Create Service Account**
   - Go to IAM & Admin → Service Accounts
   - Create service account:
     - Name: "EAS Build Upload"
     - Role: Service Account User
   - Create key → JSON
   - Download and save as `mobile/google-play-service-account.json`

3. **Grant Access in Play Console**
   - Go to Play Console → Users and permissions
   - Invite user → Service account
   - Select your service account
   - Grant permissions:
     - Releases: Create and edit releases
     - App access: View app information

4. **Add to .gitignore**
   ```bash
   echo "google-play-service-account.json" >> mobile/.gitignore
   ```

### Step 5: Create Internal Testing Track (First Release)

Before production, create an internal testing release:
1. Go to Testing → Internal testing
2. Create new release
3. Upload will be done via EAS (see Building section)

---

## Building the Apps

### Pre-Build Checklist

- [ ] `.env.production` configured with production API URL
- [ ] Google Maps API key added to `.env.production`
- [ ] Backend API deployed and accessible via HTTPS
- [ ] App Store Connect app created (iOS)
- [ ] Google Play Console app created (Android)
- [ ] All assets prepared (icons, screenshots)

### Build for iOS

```bash
cd mobile

# Build for production
npm run build:prod:ios

# Or use EAS CLI directly
eas build --platform ios --profile production
```

**What happens:**
1. EAS uploads your code to Expo servers
2. Builds on macOS machines in the cloud
3. Handles code signing automatically (you'll be prompted to create credentials)
4. Generates `.ipa` file
5. Takes 15-30 minutes

**First-time iOS build prompts:**
- "Generate new Apple Distribution Certificate?" → **Yes**
- "Generate new Apple Provisioning Profile?" → **Yes**
- EAS will handle all certificate management

### Build for Android

```bash
cd mobile

# Build for production
npm run build:prod:android

# Or use EAS CLI directly
eas build --platform android --profile production
```

**What happens:**
1. EAS uploads your code to Expo servers
2. Builds Android App Bundle (`.aab`)
3. Handles keystore generation automatically
4. Takes 10-20 minutes

**First-time Android build prompts:**
- "Generate new Android Keystore?" → **Yes**
- EAS will securely store your keystore

### Build Both Platforms Simultaneously

```bash
npm run build:prod:all
```

### Monitor Build Progress

- Check status at https://expo.dev/accounts/[your-account]/projects/fw-transportation/builds
- You'll receive email notifications when builds complete
- Download builds from the Expo dashboard

---

## Submitting to Stores

### Submit to App Store (iOS)

#### Option 1: Automated Submission via EAS

```bash
cd mobile
npm run submit:ios
```

EAS will:
1. Upload the `.ipa` to App Store Connect
2. Submit for TestFlight review (automatic)
3. You'll still need to manually submit for App Store review

#### Option 2: Manual Upload via Transporter

1. Download Apple Transporter app from Mac App Store
2. Download your `.ipa` from Expo dashboard
3. Open Transporter, drag `.ipa` file
4. Click "Deliver"

#### Complete App Store Connect Submission

1. Go to App Store Connect → My Apps → Fort Worth Transportation
2. Click "+" next to "iOS App" → "Version"
3. Enter version: `2.0.0`
4. Upload screenshots (6.7" iPhone required)
5. Fill in "What's New in This Version"
6. Add app preview video (optional)
7. Select build (the one you just uploaded)
8. Fill in App Review Information:
   - **Demo account**: Provide test driver credentials
   - **Notes**: "This is a driver app for NEMT services. Use provided test account to review trip management features."
9. Click "Submit for Review"

**Review time:** 24-48 hours typically

### Submit to Google Play (Android)

#### Option 1: Automated Submission via EAS

```bash
cd mobile
npm run submit:android
```

EAS will:
1. Upload the `.aab` to Google Play Console
2. Submit to Internal Testing track (first time)
3. Submit to Production track (subsequent releases)

#### Option 2: Manual Upload

1. Go to Play Console → Your App → Production
2. Create new release
3. Upload `.aab` file (download from Expo dashboard)
4. Enter release notes
5. Review and roll out

#### Complete Play Console Submission

1. Ensure all store listing content is complete
2. Content rating completed
3. Pricing set to Free
4. Countries selected
5. Click "Send for review"

**Review time:** 1-7 days typically

---

## Post-Deployment

### 1. Monitor Crash Reports

**iOS:**
- Xcode Organizer → Crashes
- App Store Connect → TestFlight → Crashes

**Android:**
- Play Console → Quality → Crashes & ANRs

### 2. Set Up Over-the-Air (OTA) Updates

For minor updates that don't require store review:

```bash
# Publish an update
cd mobile
eas update --branch production --message "Fix minor bug"
```

Users will get the update automatically without downloading from store.

**Note:** OTA updates only work for JavaScript changes, not native code changes.

### 3. Monitor User Feedback

- App Store Connect → Ratings and Reviews
- Google Play Console → User feedback → Reviews

Respond to reviews to improve ratings.

### 4. Track Analytics

Consider adding analytics:
- Firebase Analytics (free)
- Amplitude
- Mixpanel

### 5. Version Updates

When releasing new versions:

1. Update version in `mobile/app.config.js`:
   ```javascript
   version: "2.1.0"
   ```

2. Build and submit:
   ```bash
   npm run build:prod:all
   npm run submit:all
   ```

3. iOS: Build number auto-increments
4. Android: Version code auto-increments

---

## Troubleshooting

### Build Failures

**"Could not find Xcode project"**
- Solution: Ensure you're using `app.config.js` not `app.json`

**"Android build failed: Gradle error"**
- Solution: Check `eas.json` Android configuration
- Try: `eas build --platform android --clear-cache`

**"iOS provisioning profile error"**
- Solution: Run `eas credentials` and regenerate certificates

### Submission Rejections

**iOS: "Missing compliance information"**
- Solution: In App Store Connect, answer export compliance questions
- If using HTTPS only: Select "No" for encryption

**iOS: "App crashes on launch"**
- Solution: Test on TestFlight first
- Check crash logs in Xcode Organizer

**Android: "Missing privacy policy"**
- Solution: Add privacy policy URL in Play Console store listing

### Runtime Issues

**"API connection failed"**
- Check `.env.production` has correct API_URL
- Ensure backend has CORS configured for mobile app
- Verify SSL certificate is valid

**"Maps not loading"**
- Verify Google Maps API key in `.env.production`
- Check API key restrictions allow your bundle IDs
- Ensure Maps SDK enabled in Google Cloud Console

**"Push notifications not working"**
- iOS: Check provisioning profile includes push capability
- Android: Verify Firebase Cloud Messaging configured
- Test with Expo push notification tool

---

## Quick Reference Commands

```bash
# Login to EAS
eas login

# Build development version
npm run build:dev:ios
npm run build:dev:android

# Build production version
npm run build:prod:ios
npm run build:prod:android
npm run build:prod:all

# Submit to stores
npm run submit:ios
npm run submit:android
npm run submit:all

# Publish OTA update
eas update --branch production --message "Update description"

# Check build status
eas build:list

# View credentials
eas credentials

# Clear build cache
eas build --platform ios --clear-cache
eas build --platform android --clear-cache
```

---

## Support Resources

- **Expo Documentation**: https://docs.expo.dev
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policy**: https://play.google.com/about/developer-content-policy/
- **Expo Discord**: https://chat.expo.dev

---

## Checklist: Ready to Publish?

### Pre-Launch
- [ ] Backend API deployed to production with HTTPS
- [ ] `.env.production` configured with production values
- [ ] Google Maps API key obtained and configured
- [ ] Apple Developer account enrolled ($99/year)
- [ ] Google Play Developer account created ($25 one-time)
- [ ] App Store Connect app created
- [ ] Google Play Console app created
- [ ] All app assets prepared (icons, screenshots, descriptions)
- [ ] Privacy policy published on your website
- [ ] Test driver account created for app review

### Build & Submit
- [ ] Production builds completed successfully
- [ ] Tested builds on physical devices
- [ ] Submitted to App Store Connect
- [ ] Submitted to Google Play Console
- [ ] App review information provided
- [ ] Demo credentials provided to reviewers

### Post-Launch
- [ ] Monitor crash reports daily
- [ ] Respond to user reviews
- [ ] Set up analytics tracking
- [ ] Plan OTA update strategy
- [ ] Document version release process

---

**Good luck with your app launch! 🚀**
