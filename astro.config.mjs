// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://2-eat.com',
  integrations: [mdx(), sitemap()],
  adapter: cloudflare(),
});