/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // keep default runtime node.js for route handlers
  },
  // Make sure cookies APIs are stable for route handlers
  output: 'standalone',
  async rewrites() {
    const rawApiBase =
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'http://localhost:5000/api/v1'
    const normalizeApiBase = (input) => {
      const trimmed = input.replace(/\/$/, '')
      if (/\/api\/v\d+$/i.test(trimmed) || /\/api$/i.test(trimmed)) {
        return trimmed.endsWith('/api') ? `${trimmed}/v1` : trimmed
      }
      return `${trimmed}/api/v1`
    }
    const API_BASE = normalizeApiBase(rawApiBase)
    const API_ORIGIN = new URL(API_BASE).origin
    return [
      { source: '/api/v1/:path*', destination: `${API_ORIGIN}/api/v1/:path*` },
      { source: '/hubs/:path*', destination: `${API_ORIGIN}/hubs/:path*` },
    ]
  }
};

export default nextConfig;
