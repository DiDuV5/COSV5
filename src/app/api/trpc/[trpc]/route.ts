/**
 * @fileoverview tRPC API 路由处理器
 * @description Next.js 14 App Router 的 tRPC API 处理器
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/server: ^10.45.0
 * - next: ^14.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

// 初始化存储服务（仅在服务端）
import "@/lib/storage/server-init";

// 导入配置
import { config } from "./config";

// 导出配置
export { config };

// 处理未捕获的 Promise 拒绝（仅在开发环境）
if (process.env.NODE_ENV === "development") {
  process.on('unhandledRejection', (reason, promise) => {
    if (reason instanceof Error && reason.message.includes('Controller is already closed')) {
      // 静默处理 Controller 关闭错误
      return;
    }
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

const handler = async (req: NextRequest) => {
  try {
    return await fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext: () => createTRPCContext({ req, res: undefined }),
      onError:
        process.env.NODE_ENV === "development"
          ? ({ path, error }) => {
              // 过滤掉 Controller 关闭错误的日志
              if (!error.message.includes('Controller is already closed')) {
                console.error(
                  `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
                );
              }
            }
          : undefined,
    });
  } catch (error) {
    // 处理 Controller 关闭错误
    if (error instanceof Error && error.message.includes('Controller is already closed')) {
      // 静默处理，不输出错误日志
      // 这通常发生在长时间操作完成后，客户端连接已关闭
      return new Response(null, { status: 200 });
    }

    // 其他错误正常抛出
    throw error;
  }
};

export { handler as GET, handler as POST };
