/**
 * @fileoverview NextAuth.js 类型扩展
 * @description 扩展 NextAuth.js 的类型定义
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.1
 * @since 1.0.0
 *
 * @dependencies
 * - next-auth: ^4.24.0
 * - @prisma/client: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-07-02: 修复userLevel类型不兼容问题，使用UserLevel联合类型
 */

import { type DefaultSession } from "next-auth";
import { type UserLevel } from "@/types/user-level";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      username: string;
      userLevel: UserLevel;
      isVerified: boolean;
      canPublish: boolean;
      avatarUrl?: string | null;
      displayName?: string | null;
      approvalStatus: string;
      emailVerified?: Date | null;
      isActive: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    email?: string | null;
    userLevel: UserLevel;
    isVerified: boolean;
    canPublish: boolean;
    avatarUrl?: string | null;
    displayName?: string | null;
    approvalStatus: string;
    emailVerified?: Date | null;
    isActive: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    userLevel: UserLevel;
    isVerified: boolean;
    canPublish: boolean;
    avatarUrl?: string | null;
    displayName?: string | null;
    approvalStatus: string;
    emailVerified?: Date | null;
    isActive: boolean;
  }
}
