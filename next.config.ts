import type { NextConfig } from "next";

// Force restart for env reload
const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Ensure server-side packages are not bundled
  serverExternalPackages: ['googleapis', '@sparticuz/chromium', 'puppeteer-core', '@tauri-apps/plugin-sql'],
  // Increase body size limit for API routes
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
