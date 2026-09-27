// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://zeikin.org',
  // apex カスタムドメインで配信するため base は不要（ルート配信）
});
