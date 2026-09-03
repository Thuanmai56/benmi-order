import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.APP_ENV === 'dev';

const config: CapacitorConfig = {
  appId: 'com.benmi.pos',
  appName: 'Blab POS',
  webDir: 'dist',
  server: {
    // In dev mode or local bundled APK: omit server.url so Capacitor loads local bundled dist/
    // In prod remote loader mode: loads from live Cloudflare Pages
    ...(isDev ? {} : { url: 'https://benmi-order.pages.dev/orders.html' }),
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f172a'
  }
};

export default config;
