/**
 * @fileoverview NextAuth.js API 路由处理器
 * @description Next.js 14 App Router 的 NextAuth.js 处理器
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next-auth: ^4.24.0
 * - next: ^14.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
