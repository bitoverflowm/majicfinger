/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nivo"],
  experimental: {
    serverActions: true,
    esmExternals: 'loose'
  },
  images: {
    domains: ['pbs.twimg.com'],
  },
}

module.exports = nextConfig
