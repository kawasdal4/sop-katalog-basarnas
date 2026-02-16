import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Ensure server-side packages are not bundled
  serverExternalPackages: ['googleapis'],
};

export default nextConfig;
