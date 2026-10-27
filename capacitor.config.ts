import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syntheticae.noticed',
  appName: 'Noticed',
  webDir: 'dist',
  backgroundColor: '#121214',
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
  },
  android: {
    backgroundColor: '#121214',
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
