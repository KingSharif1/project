// Dynamic app configuration with environment support
const IS_DEV = process.env.APP_ENV === 'development';
const IS_STAGING = process.env.APP_ENV === 'staging';
const IS_PROD = process.env.APP_ENV === 'production' || (!IS_DEV && !IS_STAGING);

export default {
  expo: {
    name: IS_PROD ? "Fort Worth Transportation" : `FW Transport ${IS_STAGING ? 'Staging' : 'Dev'}`,
    slug: "fw-transportation",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#1B365D"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      buildNumber: "1",
      bundleIdentifier: IS_PROD 
        ? "com.fwtransportation.app" 
        : `com.fwtransportation.app.${IS_STAGING ? 'staging' : 'dev'}`,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "We need your location to provide accurate pickup and delivery tracking.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "We need your location to track trips and provide real-time updates to dispatchers and passengers.",
        NSLocationAlwaysUsageDescription: "Background location access is required to track active trips even when the app is not in use.",
        NSCameraUsageDescription: "We need camera access to capture trip photos and signatures.",
        NSPhotoLibraryUsageDescription: "We need photo library access to save and upload trip documentation.",
        NSPhotoLibraryAddUsageDescription: "We need permission to save photos to your library.",
        NSFaceIDUsageDescription: "Use Face ID to quickly and securely log in to your driver account.",
        NSUserNotificationUsageDescription: "We need permission to send you important trip and dispatch notifications.",
        UIBackgroundModes: ["location", "fetch", "remote-notification"]
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#1B365D"
      },
      versionCode: 1,
      package: IS_PROD 
        ? "com.fwtransportation.app" 
        : `com.fwtransportation.app.${IS_STAGING ? 'staging' : 'dev'}`,
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "FOREGROUND_SERVICE",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow Fort Worth Transportation to use your location for trip tracking and real-time updates."
        }
      ]
    ],
    updates: {
      url: "https://u.expo.dev/YOUR_PROJECT_ID" // Update this after creating EAS project
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    owner: "fwtransportation",
    scheme: "fwtransport",
    privacy: IS_PROD ? "public" : "unlisted",
    extra: {
      eas: {
        projectId: "YOUR_EAS_PROJECT_ID" // Update after running 'eas build:configure'
      },
      apiUrl: process.env.API_URL,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      environment: process.env.APP_ENV || 'production'
    }
  }
};
