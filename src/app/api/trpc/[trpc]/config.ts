/**
 * @fileoverview tRPC API 路由配置
 * @description 配置长时间运行的 API 请求处理
 * @author Augment AI
 * @date 2025-06-25
 * @version 1.0.0
 */

import { getEnvWithFallback, getNumberEnv } from '@/lib/config/env-compatibility';

// 导出运行时配置
export const runtime = 'nodejs';

// 配置 API 路由的最大执行时间（秒）
// Vercel Hobby: 10s, Pro: 60s, Enterprise: 900s
// 本地开发：无限制
const nodeEnv = getEnvWithFallback('COSEREEDEN_NODE_ENV', 'development');
export const maxDuration = getNumberEnv('COSEREEDEN_API_MAX_DURATION', nodeEnv === 'development' ? 300 : 60); // 5分钟（开发）/ 1分钟（生产）

// 配置请求体大小限制
const bodySizeLimit = getNumberEnv('COSEREEDEN_API_BODY_SIZE_LIMIT', 104857600); // 100MB
export const bodyParser = {
  sizeLimit: `${Math.round(bodySizeLimit / 1024 / 1024)}mb`, // 转换为MB格式
};

// 禁用响应大小限制
export const responseLimit = false;

// 配置 API 路由选项
export const config = {
  runtime,
  maxDuration,
  bodyParser,
  responseLimit,
};
