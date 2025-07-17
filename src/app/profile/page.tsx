/**
 * @fileoverview 个人主页重定向页面
 * @description 将 /profile 路径重定向到当前用户的个人主页或设置页面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问 /profile 会重定向到：
 * // 已登录用户: /users/[username]
 * // 未登录用户: /auth/signin
 *
 * @dependencies
 * - next: ^14.0.0
 * - react: ^18.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";

export default async function ProfileRedirectPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    // 未登录用户重定向到登录页面
    redirect("/auth/signin?callbackUrl=/profile");
  }

  // 已登录用户重定向到自己的个人主页
  redirect(`/users/${session.user.username}`);
}
