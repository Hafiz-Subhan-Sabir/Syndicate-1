/** @type {import('next').NextConfig} */
const backendOrigin = (
  process.env.BACKEND_INTERNAL_URL ||
  process.env.DJANGO_API_BASE ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    buildActivity: false
  },
  /**
   * Same-origin /api/portal-proxy/* → Django /api/* (browser never talks to :8000).
   * More reliable than app/api/.../[[...path]]/route.ts (optional catch-alls can 404 with webpack dev).
   */
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/portal-proxy/:path*",
          destination: `${backendOrigin}/api/:path*`
        },
        {
          // Backward-compatible fallback: if client accidentally hits /api/portal/* directly,
          // still proxy to Django instead of returning Next.js 404.
          source: "/api/portal/:path*",
          destination: `${backendOrigin}/api/portal/:path*`
        }
      ]
    };
  }
};

module.exports = nextConfig;

