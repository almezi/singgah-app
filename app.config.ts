// app.config.ts — Expo config (SPEC §4): name, icons, splash, location-permission
// strings (Indonesian), MapLibre config plugin. Bundle IDs are placeholders — the
// owner confirms them during store paperwork (OQ-D).
export default {
  name: 'Singgah',
  slug: 'singgah',
  version: '0.2.0',
  orientation: 'portrait',
  scheme: 'singgah',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0E7C66',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'id.singgah.app', // TODO(owner, OQ-D): confirm before store submission
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Singgah memakai lokasi Anda untuk menemukan spot terdekat.',
    },
  },
  android: {
    package: 'id.singgah.app', // TODO(owner, OQ-D): confirm before store submission
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      backgroundColor: '#0E7C66',
    },
  },
  plugins: ['@maplibre/maplibre-react-native'],
} as const;
