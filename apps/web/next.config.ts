import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      // Allow Vercel Blob Storage domain and its tenant-specific subdomains
      'public.blob.vercel-storage.com',
      '82qos1wlxbd4iq1g.public.blob.vercel-storage.com',
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
  eslint: {
    // Disable ESLint during build for Vercel
    ignoreDuringBuilds: true,
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
