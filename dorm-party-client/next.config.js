/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone 模式，用于 Docker 部署
  output: 'standalone',
  // 允许远程图片域名（头像、角色图片等）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 环境变量配置
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
  },
  // React 严格模式
  reactStrictMode: true,
};

module.exports = nextConfig;
