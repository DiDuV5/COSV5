/**
 * @fileoverview 用户关注列表页面
 * @description 显示指定用户关注的所有用户列表
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问路径: /users/[username]/following
 * // 显示用户关注的人员列表
 *
 * @dependencies
 * - next: ^14.0.0
 * - @trpc/server: ^10.0.0
 * - prisma: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { notFound } from "next/navigation";
import { api } from "@/trpc/server";
import { UserFollowingClient } from "@/components/profile/user-following-client";

interface UserFollowingPageProps {
  params: {
    username: string;
  };
}

export default async function UserFollowingPage({ params }: UserFollowingPageProps) {
  try {
    // 获取用户信息
    const user = await api.user.getByUsername({ username: params.username });

    if (!user) {
      notFound();
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {user.displayName || user.username} 的关注
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            查看 {user.displayName || user.username} 关注的用户
          </p>
        </div>

        <UserFollowingClient user={user} />
      </div>
    );
  } catch (error) {
    console.error("获取用户信息失败:", error);
    notFound();
  }
}

export async function generateMetadata({ params }: UserFollowingPageProps) {
  try {
    const user = await api.user.getByUsername({ username: params.username });
    
    if (!user) {
      return {
        title: "用户不存在",
      };
    }

    return {
      title: `${user.displayName || user.username} 的关注 - Tu`,
      description: `查看 ${user.displayName || user.username} 关注的用户列表`,
    };
  } catch {
    return {
      title: "用户关注列表",
    };
  }
}
