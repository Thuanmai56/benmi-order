import type { CapacitorConfig } from '@capacitor/cli';

const appEnv = process.env.APP_ENV || 'prod';

const getRemoteUrl = (env: string): string | undefined => {
  switch (env) {
    case 'dev':
      return 'https://dev.benmi-order.pages.dev/orders.html';
    case 'staging':
      return 'https://staging.benmi-order.pages.dev/orders.html';
    case 'local':
      return undefined; // Uses bundled local dist/
    case 'prod':
    default:
      return 'https://benmi-order.pages.dev/orders.html';
  }
};

const remoteUrl = getRemoteUrl(appEnv);

const config: CapacitorConfig = {
  appId: 'com.benmi.pos',
  appName: 'Blab POS',
  webDir: 'dist',
  server: {
    ...(remoteUrl ? { url: remoteUrl } : {}),
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f172a'
  }
};

export default config;
