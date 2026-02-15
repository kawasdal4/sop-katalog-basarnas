import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Disable Turbopack for production build to fix module resolution issues
  experimental: {
    turbo: false,
    serverComponentsExternalPackages: ['googleapis', 'react-pdf'],
  },
  // Ensure server-side packages are not bundled
  serverExternalPackages: ['googleapis', 'react-pdf'],
};

export default nextConfig;
