const { withNextVideo } = require('next-video/process')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nivo"],
  experimental: {
    esmExternals: 'loose',
    optimizeFonts: true,
  },
  images: {
    domains: ['pbs.twimg.com', 'abs.twimg.com', 'randomuser.me', 'cdn.magicui.design'],
  },
}

module.exports = withNextVideo(nextConfig)
