/**
 * @fileoverview 用户获赞统计页面
 * @description 显示指定用户的获赞统计和详细信息
 * @author Augment AI
 * @date 2025-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问路径: /users/[username]/likes
 * // 显示用户的获赞统计
 *
 * @dependencies
 * - next: ^14.0.0
 * - @trpc/server: ^10.0.0
 * - prisma: ^5.0.0
 *
 * @changelog
 * - 2025-01-XX: 初始版本创建
 */

import { notFound } from "next/navigation";
import { api } from "@/trpc/server";
import { UserLikesClient } from "@/components/profile/user-likes-client";

interface UserLikesPageProps {
  params: {
    username: string;
  };
}

export default async function UserLikesPage({ params }: UserLikesPageProps) {
  try {
    // 获取用户信息
    const user = await api.user.getByUsername({ username: params.username });

    if (!user) {
      notFound();
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user.displayName || user.username} 的获赞统计
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            查看 {user.displayName || user.username} 的获赞详情和统计
          </p>
        </div>

        <UserLikesClient user={user} />
      </div>
    );
  } catch (error) {
    console.error("获取用户信息失败:", error);
    notFound();
  }
}
