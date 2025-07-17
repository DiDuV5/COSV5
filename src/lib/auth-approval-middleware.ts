/**
 * @fileoverview 用户审核状态中间件
 * @description 检查用户审核状态并处理相应的访问控制
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - NextAuth.js
 * - @/lib/user-approval-helper
 *
 * @changelog
 * - 2025-06-22: 初始版本创建，用户审核状态中间件
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getApprovalConfig } from "@/lib/user-approval-helper";

/**
 * 需要审核检查的路径模式
 */
const PROTECTED_PATHS = [
  "/dashboard",
  "/profile",
  "/create",
  "/moments",
  "/upload",
  "/admin",
  "/api/trpc",
];

/**
 * 不需要审核检查的路径模式
 */
const PUBLIC_PATHS = [
  "/",
  "/auth",
  "/login",
  "/register",
  "/pending-approval",
  "/api/auth",
  "/api/public",
  "/_next",
  "/favicon.ico",
];

/**
 * 管理员路径（管理员即使未审核也可以访问）
 */
const ADMIN_PATHS = [
  "/admin",
];

/**
 * 检查路径是否需要审核验证
 */
function needsApprovalCheck(pathname: string): boolean {
  // 检查是否为公开路径
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return false;
  }

  // 检查是否为受保护路径
  return PROTECTED_PATHS.some(path => pathname.startsWith(path));
}

/**
 * 检查是否为管理员路径
 */
function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some(path => pathname.startsWith(path));
}

/**
 * 用户审核状态中间件
 */
export async function authApprovalMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 如果不需要审核检查，直接通过
  if (!needsApprovalCheck(pathname)) {
    return NextResponse.next();
  }

  try {
    // 获取用户token
    const token = await getToken({ 
      req: request,
      secret: process.env.COSEREEDEN_NEXTAUTH_SECRET 
    });

    // 如果没有token，重定向到登录页
    if (!token) {
      const loginUrl = new URL("/auth/signin", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 获取审核配置
    const config = await getApprovalConfig();

    // 如果未启用审核功能，直接通过
    if (!config.registrationApprovalEnabled) {
      return NextResponse.next();
    }

    // 检查用户审核状态
    const userApprovalStatus = token.approvalStatus as string;
    const userLevel = token.userLevel as string;

    // 管理员可以访问管理员路径，即使未审核
    if (isAdminPath(pathname) && (userLevel === "ADMIN" || userLevel === "SUPER_ADMIN")) {
      return NextResponse.next();
    }

    // 如果用户状态为待审核，重定向到待审核页面
    if (userApprovalStatus === "PENDING") {
      // 避免重定向循环
      if (pathname === "/pending-approval") {
        return NextResponse.next();
      }
      
      const pendingUrl = new URL("/pending-approval", request.url);
      return NextResponse.redirect(pendingUrl);
    }

    // 如果用户状态为已拒绝，重定向到待审核页面（显示拒绝信息）
    if (userApprovalStatus === "REJECTED") {
      // 避免重定向循环
      if (pathname === "/pending-approval") {
        return NextResponse.next();
      }
      
      const pendingUrl = new URL("/pending-approval", request.url);
      return NextResponse.redirect(pendingUrl);
    }

    // 如果用户状态为已批准，正常通过
    if (userApprovalStatus === "APPROVED") {
      return NextResponse.next();
    }

    // 其他情况（状态异常），重定向到待审核页面
    const pendingUrl = new URL("/pending-approval", request.url);
    return NextResponse.redirect(pendingUrl);

  } catch (error) {
    console.error("审核状态中间件错误:", error);
    
    // 发生错误时，如果是关键路径，重定向到登录页
    if (PROTECTED_PATHS.some(path => pathname.startsWith(path))) {
      const loginUrl = new URL("/auth/signin", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // 非关键路径，允许通过
    return NextResponse.next();
  }
}

/**
 * 客户端审核状态检查Hook
 */
export function useApprovalStatus() {
  // 这个函数将在客户端组件中使用
  // 用于检查用户的审核状态并提供相应的UI反馈
  
  return {
    checkApprovalStatus: async () => {
      // 实现客户端审核状态检查逻辑
      // 可以调用API来获取最新的用户状态
    },
    
    isApprovalRequired: (userLevel: string, approvalStatus: string) => {
      // 检查是否需要审核
      return approvalStatus === "PENDING" || approvalStatus === "REJECTED";
    },
    
    canAccessPath: (pathname: string, userLevel: string, approvalStatus: string) => {
      // 检查用户是否可以访问特定路径
      if (!needsApprovalCheck(pathname)) {
        return true;
      }
      
      if (isAdminPath(pathname) && (userLevel === "ADMIN" || userLevel === "SUPER_ADMIN")) {
        return true;
      }
      
      return approvalStatus === "APPROVED";
    }
  };
}

/**
 * 服务端审核状态检查函数
 */
export async function checkUserApprovalStatus(userId: string) {
  try {
    // 这里可以添加服务端的用户状态检查逻辑
    // 例如查询数据库获取用户的最新审核状态
    
    return {
      needsApproval: false,
      approvalStatus: "APPROVED",
      canAccess: true,
    };
  } catch (error) {
    console.error("检查用户审核状态失败:", error);
    return {
      needsApproval: true,
      approvalStatus: "PENDING",
      canAccess: false,
    };
  }
}

/**
 * 获取审核状态的显示文本
 */
export function getApprovalStatusDisplay(status: string) {
  switch (status) {
    case "PENDING":
      return {
        text: "待审核",
        color: "orange",
        description: "您的账号正在等待管理员审核"
      };
    case "APPROVED":
      return {
        text: "已通过",
        color: "green",
        description: "您的账号已通过审核，可以正常使用"
      };
    case "REJECTED":
      return {
        text: "已拒绝",
        color: "red",
        description: "很抱歉，您的账号审核未通过"
      };
    default:
      return {
        text: "未知",
        color: "gray",
        description: "账号状态异常，请联系管理员"
      };
  }
}
