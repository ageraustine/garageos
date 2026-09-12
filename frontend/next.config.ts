import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true, // recommended for static hosts like DO App Platform
};

export default nextConfig;