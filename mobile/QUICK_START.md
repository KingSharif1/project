# Quick Start: Publishing Your Mobile App

This is a condensed version of the full deployment guide. For detailed instructions, see `DEPLOYMENT_GUIDE.md`.

## 🎯 What You Need

### Accounts (Set these up first)
1. **Expo Account** - Free at https://expo.dev
2. **Apple Developer** - $99/year at https://developer.apple.com/programs/
3. **Google Play Developer** - $25 one-time at https://play.google.com/console

### Required Information
- Production backend API URL (must be HTTPS)
- Google Maps API Key
- Test driver credentials for app reviewers

---

## 📋 Step-by-Step Checklist

### 1. Initial Setup (One-time)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Navigate to mobile folder
cd mobile

# Login to Expo
eas login

# Configure EAS project
eas build:configure
```

After `eas build:configure`, you'll get an EAS Project ID. Update:
- `mobile/app.config.js` → `extra.eas.projectId`
- `mobile/.env.production` → `EAS_PROJECT_ID`

### 2. Configure Environment

Edit `mobile/.env.production`:

```env
APP_ENV=production
API_URL=https://api.yourdomain.com/api/mobile
GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_KEY_HERE
```

**Get Google Maps API Key:**
1. Go to https://console.cloud.google.com
2. Enable: Maps SDK for iOS, Maps SDK for Android, Geocoding API
3. Create API Key
4. Restrict to bundle IDs: `com.fwtransportation.app`

### 3. Deploy Your Backend

Your backend must be accessible via HTTPS. Deploy to:
- AWS, DigitalOcean, Heroku, Railway, or Render
- Update `API_URL` in `.env.production` with your domain

### 4. Apple App Store Setup

1. **Enroll in Apple Developer Program** ($99/year)
   - https://developer.apple.com/programs/

2. **Create App in App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - My Apps → + → New App
   - Bundle ID: `com.fwtransportation.app`
   - Note your App ID and Team ID

3. **Update `mobile/eas.json`:**
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "your-email@example.com",
         "ascAppId": "1234567890",
         "appleTeamId": "ABC123XYZ"
       }
     }
   }
   ```

4. **Prepare Assets:**
   - App Icon: 1024x1024 PNG
   - Screenshots: 1290x2796 (6.7" iPhone) - need 3-10
   - Privacy Policy URL

### 5. Google Play Store Setup

1. **Create Developer Account** ($25 one-time)
   - https://play.google.com/console

2. **Create App**
   - Create app → Fill in details
   - Package name: `com.fwtransportation.app`

3. **Create Service Account for Automated Upload:**
   - Go to https://console.cloud.google.com
   - Enable "Google Play Developer API"
   - Create Service Account → Download JSON key
   - Save as `mobile/google-play-service-account.json`
   - Grant access in Play Console → Users and permissions

4. **Prepare Assets:**
   - App Icon: 512x512 PNG
   - Screenshots: 1080x1920 to 1080x2400 - need 2-8
   - Feature Graphic: 1024x500 PNG
   - Privacy Policy URL

### 6. Build the Apps

```bash
cd mobile

# Build iOS
npm run build:prod:ios

# Build Android
npm run build:prod:android

# Or build both
npm run build:prod:all
```

**First build will prompt for credentials:**
- iOS: EAS will generate certificates automatically (say Yes)
- Android: EAS will generate keystore automatically (say Yes)

**Build time:** 15-30 minutes for iOS, 10-20 minutes for Android

Monitor at: https://expo.dev

### 7. Submit to Stores

```bash
# Submit to App Store
npm run submit:ios

# Submit to Google Play
npm run submit:android

# Or submit both
npm run submit:all
```

### 8. Complete Store Listings

**App Store Connect:**
1. Go to your app → Version
2. Upload screenshots
3. Add "What's New" description
4. Select the build
5. Provide test account credentials
6. Submit for Review

**Google Play Console:**
1. Complete Store Listing (description, screenshots)
2. Complete Content Rating questionnaire
3. Set pricing to Free
4. Review and publish

---

## ⚡ Common Commands

```bash
# Build for testing
npm run build:preview:ios
npm run build:preview:android

# Build for production
npm run build:prod:all

# Submit to stores
npm run submit:all

# Publish OTA update (JavaScript only)
eas update --branch production --message "Bug fix"

# Check build status
eas build:list

# View/manage credentials
eas credentials
```

---

## 🚨 Troubleshooting

**Build fails:**
```bash
# Clear cache and rebuild
eas build --platform ios --clear-cache
```

**API not connecting:**
- Check `.env.production` has correct HTTPS URL
- Verify backend CORS allows mobile app
- Test API endpoint in browser

**Maps not loading:**
- Verify Google Maps API key in `.env.production`
- Check API key restrictions in Google Cloud Console
- Ensure Maps SDK enabled for iOS and Android

**App rejected:**
- iOS: Provide detailed test instructions and demo account
- Android: Ensure privacy policy URL is accessible
- Both: Respond to reviewer questions within 24 hours

---

## 📱 Testing Before Submission

1. **Build preview version:**
   ```bash
   npm run build:preview:ios
   npm run build:preview:android
   ```

2. **Install on physical device:**
   - Download from Expo dashboard
   - iOS: Install via TestFlight
   - Android: Download APK directly

3. **Test checklist:**
   - [ ] Login works
   - [ ] GPS tracking works
   - [ ] Maps display correctly
   - [ ] Can accept/complete trips
   - [ ] Signatures save
   - [ ] Messages send/receive
   - [ ] Push notifications work

---

## 📊 After Launch

- **Monitor crashes:** App Store Connect & Play Console
- **Respond to reviews:** Improves ratings
- **Track analytics:** Consider Firebase Analytics
- **OTA updates:** For minor JavaScript fixes without store review

---

## 🆘 Need Help?

- Full guide: `DEPLOYMENT_GUIDE.md`
- Expo Docs: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- Expo Discord: https://chat.expo.dev

---

## ✅ Pre-Launch Checklist

- [ ] Backend deployed with HTTPS
- [ ] `.env.production` configured
- [ ] Google Maps API key obtained
- [ ] Apple Developer account enrolled
- [ ] Google Play Developer account created
- [ ] App Store Connect app created
- [ ] Google Play Console app created
- [ ] Icons and screenshots prepared
- [ ] Privacy policy published
- [ ] Test account ready for reviewers
- [ ] Builds completed successfully
- [ ] Tested on physical devices

**You're ready to publish! 🚀**
