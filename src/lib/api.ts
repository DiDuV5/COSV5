/**
 * @fileoverview tRPC 客户端配置
 * @description 配置 tRPC 客户端用于前端 API 调用
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/client: ^11.4.2
 * - @trpc/react-query: ^11.4.2
 * - @tanstack/react-query: ^5.81.2
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/api/root';

export const api = createTRPCReact<AppRouter>();
