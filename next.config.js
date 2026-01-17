/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    // Handle file uploads and STL files
    config.module.rules.push({
      test: /\.(stl)$/,
      use: 'raw-loader',
    });
    return config;
  },
};

module.exports = nextConfig;
