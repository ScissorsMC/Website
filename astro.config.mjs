// @ts-check
import {defineConfig, fontProviders} from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import {cacheCloudflare} from '@astrojs/cloudflare/cache';
import sitemap from '@astrojs/sitemap';
import tailwindcss from "@tailwindcss/vite";


// https://astro.build/config
export default defineConfig({
    site: "https://scissors.gg",
    output: 'server',
    cache: {
        provider: cacheCloudflare(),
    },
    routeRules: {
        '/': {maxAge: 300, swr: 600},
        '/downloads': {maxAge: 300, swr: 600},
        '/downloads/[version]': {maxAge: 300, swr: 600},
    },
    prefetch: {
        prefetchAll: true,
        defaultStrategy: 'viewport',
    },
    fonts: [
        {
            provider: fontProviders.google(),
            name: 'Space Grotesk',
            cssVariable: '--font-space-grotesk',
            weights: [400, 500, 700],
        },
        {
            provider: fontProviders.google(),
            name: 'JetBrains Mono',
            cssVariable: '--font-jetbrains-mono',
            weights: [400, 500],
        },
    ],
    vite: {
        plugins: [tailwindcss()],
    },
    adapter: cloudflare({
        imageService: 'compile',
    }),
    integrations: [sitemap()],
});
