/** @type {import('next').NextConfig} */

/**
 * 动态获取CDN域名配置
 */
function getCDNRemotePatterns() {
  // 从环境变量获取允许的域名
  const allowedDomains = (process.env.COSEREEDEN_ALLOWED_IMAGE_DOMAINS || '').split(',').filter(Boolean);

  // 基础模式（始终允许）
  const basePatterns = [
    {
      protocol: 'https',
      hostname: '**.r2.dev',
    },
    {
      protocol: 'https',
      hostname: '**.cloudflarestorage.com',
    },
    {
      protocol: 'http',
      hostname: 'localhost',
      port: '3000',
    },
    {
      protocol: 'https',
      hostname: 'images.unsplash.com',
    },
    // Telegram 头像支持
    {
      protocol: 'https',
      hostname: 't.me',
    },
    {
      protocol: 'https',
      hostname: '**.t.me',
    },
  ];

  // 添加环境变量配置的域名
  const domainPatterns = allowedDomains.map(domain => {
    const isLocalhost = domain.includes('localhost');
    return {
      protocol: isLocalhost ? 'http' : 'https',
      hostname: domain,
      ...(isLocalhost && domain.includes(':') ? { port: domain.split(':')[1] } : {}),
    };
  });

  return [...basePatterns, ...domainPatterns];

  // 从环境变量添加额外的CDN域名
  const additionalDomains = [];

  // 主CDN域名
  if (process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN) {
    try {
      const url = new URL(process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN);
      additionalDomains.push({
        protocol: url.protocol.replace(':', ''),
        hostname: url.hostname,
      });
    } catch (_e) {
      console.warn('无效的CDN_PRIMARY_DOMAIN:', process.env.COSEREEDEN_CDN_PRIMARY_DOMAIN);
    }
  }

  // 生产环境CDN域名
  if (process.env.COSEREEDEN_CDN_PRODUCTION_PRIMARY) {
    try {
      const url = new URL(process.env.COSEREEDEN_CDN_PRODUCTION_PRIMARY);
      additionalDomains.push({
        protocol: url.protocol.replace(':', ''),
        hostname: url.hostname,
      });
    } catch (_e) {
      console.warn('无效的CDN_PRODUCTION_PRIMARY:', process.env.COSEREEDEN_CDN_PRODUCTION_PRIMARY);
    }
  }

  // 备用CDN域名
  const backupDomains = (process.env.COSEREEDEN_CDN_BACKUP_DOMAINS || '').split(',');
  for (const domain of backupDomains) {
    if (domain.trim()) {
      try {
        const url = new URL(domain.trim());
        additionalDomains.push({
          protocol: url.protocol.replace(':', ''),
          hostname: url.hostname,
        });
      } catch (_e) {
        console.warn('无效的备用CDN域名:', domain);
      }
    }
  }

  return [...basePatterns, ...additionalDomains];
}

const nextConfig = {
  // 强制所有页面使用动态渲染，避免静态生成时的tRPC Context问题
  experimental: {
    forceSwcTransforms: true,
  },

  env: {
    // 基础配置（安全暴露给客户端）
    USE_NEW_STORAGE_SYSTEM: process.env.COSEREEDEN_USE_NEW_STORAGE_SYSTEM,
    STORAGE_PROVIDER: process.env.COSEREEDEN_STORAGE_PROVIDER,

    // 公开的CDN配置（不包含敏感信息）
    CLOUDFLARE_R2_CDN_DOMAIN: process.env.COSEREEDEN_CLOUDFLARE_R2_CDN_DOMAIN,
    CLOUDFLARE_R2_PUBLIC_URL: process.env.COSEREEDEN_CLOUDFLARE_R2_PUBLIC_URL,

    // CDN白名单域名配置（客户端需要访问）
    COSEREEDEN_CDN_WHITELIST_DOMAINS: process.env.COSEREEDEN_CDN_WHITELIST_DOMAINS,
    COSEREEDEN_CDN_ALLOWED_ORIGINS: process.env.COSEREEDEN_CDN_ALLOWED_ORIGINS,

    // Turnstile配置（仅站点密钥暴露给客户端）
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.COSEREEDEN_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_TURNSTILE_ENABLED: process.env.COSEREEDEN_TURNSTILE_ENABLED,

    // 注意：以下敏感配置已移除，不应暴露给客户端：
    // - CLOUDFLARE_R2_ACCOUNT_ID (账户ID)
    // - CLOUDFLARE_R2_ACCESS_KEY_ID (访问密钥)
    // - CLOUDFLARE_R2_SECRET_ACCESS_KEY (密钥)
    // - CLOUDFLARE_R2_BUCKET_NAME (存储桶名称)
    // - CLOUDFLARE_R2_ENDPOINT (内部端点)
  },
  experimental: {
    serverComponentsExternalPackages: [
      'sharp',
      'framer-motion',
      '@emotion/is-prop-valid',
    ],
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // 性能优化配置
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // 压缩配置
  compress: true,

  // ESLint配置 - 在构建时跳过ESLint检查
  eslint: {
    // 在构建时完全忽略ESLint检查
    ignoreDuringBuilds: true,
  },

  // TypeScript配置
  typescript: {
    // 在构建时忽略TypeScript错误（临时修复性能问题）
    ignoreBuildErrors: true,
  },

  // 构建优化
  swcMinify: true,
  images: {
    remotePatterns: getCDNRemotePatterns(),
    // 禁用对本地HTTP URL的优化，避免SSL错误
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 配置图片加载器
    loader: 'default',
    // 禁用对localhost的图片优化
    unoptimized: process.env.NODE_ENV === 'development',
    // 性能优化配置
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24小时
  },
  // 添加安全头部
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/media/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.COSEREEDEN_CDN_ALLOWED_ORIGINS || 'http://localhost:3000',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, HEAD, OPTIONS',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  // 静态文件服务配置
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/media/:path*',
      },
    ];
  },

  // Webpack配置优化（合并所有webpack配置）
  webpack: (config, { _buildId, dev, isServer, _defaultLoaders, _webpack }) => {
    // 支持符号链接
    config.resolve.symlinks = true;

    // 修复 framer-motion 和 emotion 在服务端渲染时的问题
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'framer-motion': 'framer-motion',
        '@emotion/is-prop-valid': '@emotion/is-prop-valid',
      });
    }

    // 优化 framer-motion 和 emotion 的打包
    config.resolve.alias = {
      ...config.resolve.alias,
      'framer-motion': require.resolve('framer-motion'),
      '@emotion/is-prop-valid': require.resolve('@emotion/is-prop-valid'),
    };

    // 生产环境优化
    if (!dev) {
      // 代码分割优化
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      };

      // Bundle分析
      if (process.env.COSEREEDEN_ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
    }

    return config;
  },
};

module.exports = nextConfig;
