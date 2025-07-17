/**
 * @fileoverview 用户作品列表页面
 * @description 显示指定用户发布的所有作品列表
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问路径: /users/[username]/posts
 * // 显示用户发布的作品列表
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
import { UserPostsClient } from "@/components/profile/user-posts-client";

interface UserPostsPageProps {
  params: {
    username: string;
  };
}

export default async function UserPostsPage({ params }: UserPostsPageProps) {
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
            {user.displayName || user.username} 的作品
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            浏览 {user.displayName || user.username} 发布的所有作品
          </p>
        </div>

        <UserPostsClient user={user} />
      </div>
    );
  } catch (error) {
    console.error("获取用户信息失败:", error);
    notFound();
  }
}

export async function generateMetadata({ params }: UserPostsPageProps) {
  try {
    const user = await api.user.getByUsername({ username: params.username });
    
    if (!user) {
      return {
        title: "用户不存在",
      };
    }

    return {
      title: `${user.displayName || user.username} 的作品 - 兔图`,
      description: `浏览 ${user.displayName || user.username} 发布的cosplay作品和写真`,
    };
  } catch {
    return {
      title: "用户作品列表",
    };
  }
}
