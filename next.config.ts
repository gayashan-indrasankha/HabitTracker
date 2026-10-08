import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  ...(process.env.HABITFLOW_E2E_ISOLATED ? { distDir: '.next-e2e' } : {}),
};

export default nextConfig;
