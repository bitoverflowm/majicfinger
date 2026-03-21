const path = require('path')
const { withNextVideo } = require('next-video/process')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nivo", "@duckdb/duckdb-wasm", "apache-arrow"],
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@duckdb/duckdb-wasm': path.join(
          __dirname,
          'node_modules',
          '@duckdb',
          'duckdb-wasm',
          'dist',
          'duckdb-browser.mjs',
        ),
      }
    }
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 'abs.twimg.com' },
      { protocol: 'https', hostname: 'randomuser.me' },
      { protocol: 'https', hostname: 'cdn.magicui.design' },
      { protocol: 'https', hostname: 'ph-avatars.imgix.net' },
      { protocol: 'https', hostname: 'media.theresanaiforthat.com' },
    ],
  },
}

module.exports = withNextVideo(nextConfig)
