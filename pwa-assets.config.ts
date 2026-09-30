import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the PWA / home-screen icons from public/logo.svg: `npm run generate-pwa-assets`.
// logo.svg is already full-bleed with artwork inside the maskable safe zone, so no extra padding.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#3d2518' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#3d2518' } },
  },
  images: ['public/logo.svg'],
});
