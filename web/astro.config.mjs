import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import manifest from './web.manifest.ts';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,
  vite: { optimizeDeps: { include: ['astro/assets/services/noop'] } },
  integrations: [react(), {
    name: 'ae-public-pages',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const page of manifest.pages) {
          if (page.access.kind !== 'public') throw new Error('Private pages require an authorization adapter');
          injectRoute({
            pattern: page.path,
            entrypoint: fileURLToPath(new URL(`../${page.entrypoint}`, import.meta.url)),
            prerender: false,
          });
        }
      },
    },
  }],
  devToolbar: { enabled: false },
});
