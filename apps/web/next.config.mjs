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
};

export default nextConfig;
