/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  transpilePackages: ['@theonetrade/shared-types'],
  images: {
    domains: ['localhost', 'pos.feastigo.com'],
  },
  typescript: {
    // Monorepo @types/react version conflict (mobile@19 vs web@18)
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
