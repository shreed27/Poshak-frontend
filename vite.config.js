import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Public site address, used for link previews (WhatsApp / Google need absolute URLs). Set VITE_SITE_URL where you build.
  const site = (loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL || 'https://pohsak.com').replace(/\/$/, '');
  return {
    plugins: [react(), { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', site) }],
    server: {
      port: 3000,
      open: true
    }
  };
});
