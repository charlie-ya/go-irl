import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goirl.app',
  appName: 'Roamin\' Empire',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '675006608980-ia7sek9fmsnrv2um9q2jfs7hg8umh2c9.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
