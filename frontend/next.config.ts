import path from 'node:path';
import type { NextConfig } from 'next';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  // This app is nested inside the backend repo, which has its own lockfile.
  outputFileTracingRoot: path.join(__dirname),
  // REST calls go through /api/* on the Next server, so the backend needs no CORS setup.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
