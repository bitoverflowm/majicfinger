const path = require('path')
const { withNextVideo } = require('next-video/process')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nivo", "@duckdb/duckdb-wasm", "apache-arrow"],
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config, { isServer }) => {
    // One Yjs module instance: @blocknote/core nests y-prosemirror; duplicate copies break
    // instanceof / constructor checks (https://github.com/yjs/yjs/issues/438).
    config.resolve.alias = {
      ...config.resolve.alias,
      yjs: path.join(__dirname, 'node_modules', 'yjs'),
      'y-protocols': path.join(__dirname, 'node_modules', 'y-protocols'),
      lib0: path.join(__dirname, 'node_modules', 'lib0'),
    }
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
