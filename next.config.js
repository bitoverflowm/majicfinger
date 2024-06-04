/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nivo"],
  experimental: {
    esmExternals: 'loose'
  },
  images: {
    domains: ['pbs.twimg.com', 'abs.twimg.com'],
  },
}

module.exports = nextConfig
