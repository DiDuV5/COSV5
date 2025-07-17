/**
 * @fileoverview 用户资料设置页面
 * @description 用户编辑个人资料的页面，包括基本信息、头像、横幅等
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问路径: /settings/profile
 * // 用户可以编辑个人资料信息
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
import { ProfileSettingsClient } from "@/components/settings/profile-settings-client";

export default async function ProfileSettingsPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          编辑资料
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          管理您的个人资料信息和隐私设置
        </p>
      </div>

      <ProfileSettingsClient />
    </div>
  );
}
