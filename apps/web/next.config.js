/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  transpilePackages: ['@theonetrade/shared-types'],
  images: {
    domains: ['localhost', 'pos.feastigo.com'],
  },
};

module.exports = nextConfig;
