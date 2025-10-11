/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@b2b-plus/shared', '@b2b-plus/ui', '@b2b-plus/supabase'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig

