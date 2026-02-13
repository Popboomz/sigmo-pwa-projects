import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Turbopack configuration
  turbopack: {
    root: __dirname,
  },

  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site', '127.0.0.1', 'localhost'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },

  // Disable x-powered-by header for security
  poweredByHeader: false,
};

export default nextConfig;
