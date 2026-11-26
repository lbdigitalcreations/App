/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@lbdc/shared'],
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'api.lbdigitalcreations.in' },
      { protocol: 'https', hostname: 'lbdigitalcreations.in' },
    ],
  },
  async rewrites() {
    if (process.env.INTERNAL_API_URL) {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.INTERNAL_API_URL}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
