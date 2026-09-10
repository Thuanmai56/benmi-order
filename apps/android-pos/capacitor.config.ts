import type { CapacitorConfig } from '@capacitor/cli';

const appEnv = process.env.APP_ENV || 'prod';

const getRemoteUrl = (env: string): string | undefined => {
  switch (env) {
    case 'dev':
      return 'https://dev.benmi-order.pages.dev/orders.html';
    case 'staging':
      return 'https://staging.benmi-order.pages.dev/orders.html';
    case 'dev-local':
    case 'pilot':
    case 'local':
      return undefined; // Uses bundled local dist/
    case 'prod':
    default:
      return 'https://benmi-order.pages.dev/orders.html';
  }
};

const remoteUrl = getRemoteUrl(appEnv);

const config: CapacitorConfig = {
  appId: (appEnv === 'dev-local' || appEnv === 'dev') ? 'com.benmi.pos.dev' : appEnv === 'pilot' ? 'com.benmi.pos.pilot' : 'com.benmi.pos',
  appName: (appEnv === 'dev-local' || appEnv === 'dev') ? 'Blab POS Dev' : appEnv === 'pilot' ? 'Blab POS Pilot' : 'Blab POS',
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
