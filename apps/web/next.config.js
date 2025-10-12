/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@b2b-plus/shared', '@b2b-plus/ui', '@b2b-plus/supabase'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
