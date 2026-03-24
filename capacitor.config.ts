import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apas.android',
  appName: 'APAS',
  webDir: 'dist',
  android: {
    overrideUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    initialFocus: true,
    backgroundColor: '#0f172a',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
