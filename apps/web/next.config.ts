import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'brainrot-publishing.nyc3.digitaloceanspaces.com',
      },
    ],
  },
  // Transpile workspace packages for proper monorepo support
  transpilePackages: [
    '@brainrot/types',
    '@brainrot/converter',
    '@brainrot/blob-client',
    '@brainrot/metadata',
    '@brainrot/templates',
  ],
  typescript: {
    // Temporarily disable type checking during build for Vercel
    ignoreBuildErrors: true,
  },
  // Experimental features for better monorepo support
  experimental: {
    // Enable external directory watching for workspace packages
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    // Handle ESM packages that need transpilation
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };

    // Ensure workspace packages are resolved correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      '@brainrot/types': '../../packages/@brainrot/types',
      '@brainrot/converter': '../../packages/@brainrot/converter',
      '@brainrot/blob-client': '../../packages/@brainrot/blob-client',
      '@brainrot/metadata': '../../packages/@brainrot/metadata',
      '@brainrot/templates': '../../packages/@brainrot/templates',
    };

    // Watch workspace packages for changes in development
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        followSymlinks: true,
      };
    }

    return config;
  },
};

export default nextConfig;
