import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.ucarecdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.ucarecd.net',
      },
    ],
  },
};

export default nextConfig;
