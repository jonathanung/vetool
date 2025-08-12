/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // keep default runtime node.js for route handlers
  },
  // Make sure cookies APIs are stable for route handlers
  output: 'standalone',
  async rewrites() {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/v1'
    const API_ORIGIN = new URL(API_BASE).origin
    return [
      { source: '/api/v1/:path*', destination: `${API_ORIGIN}/api/v1/:path*` },
      { source: '/hubs/:path*', destination: `${API_ORIGIN}/hubs/:path*` },
    ]
  }
};

export default nextConfig;
