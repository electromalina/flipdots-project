/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Removed 'output: export' - it breaks API routes and getServerSideProps
  // Use 'next build' for production, 'next export' only if you need static export
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Don't use basePath for Vercel deployments (Vercel handles routing)
  // Only use basePath if deploying to a subdirectory on custom hosting
  basePath: process.env.BASE_PATH || '',
  async rewrites() {
    // Only apply rewrites if basePath is set (for custom hosting)
    if (process.env.BASE_PATH) {
      return [
        {
          source: `${process.env.BASE_PATH}/:path*`,
          destination: '/api/:path*',
        },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

