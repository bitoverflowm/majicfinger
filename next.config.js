/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nivo"],
  experimental: {
    serverActions: true,
    esmExternals: 'loose'
  },
  images: {
    domains: [''],
  },
}

module.exports = nextConfig
