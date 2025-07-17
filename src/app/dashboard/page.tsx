/**
 * @fileoverview 个人中心页面
 * @description 用户个人中心主页，包含基本信息、罐头系统、数据统计和快捷功能入口
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问路径: /dashboard
 * // 用户个人中心主页
 *
 * @dependencies
 * - next: ^14.0.0
 * - @trpc/server: ^10.0.0
 * - next-auth: ^4.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <DashboardClient />
    </div>
  );
}
