/**
 * @fileoverview 用户个人主页页面
 * @description 显示用户的个人信息、发布的内容、访客记录等完整功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 * @since 1.0.0
 *
 * @example
 * // 访问用户主页
 * /users/username
 *
 * @dependencies
 * - next: ^14.0.0
 * - @trpc/server: ^10.0.0
 * - react: ^18.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 完善个人主页功能，添加访客记录、社交链接等
 */

import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Suspense } from "react";

import { api } from "@/trpc/server";
import { getServerAuthSession } from "@/lib/auth";
import { UserProfileClient } from "@/components/profile/user-profile-client";

interface UserPageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  try {
    const user = await api.user.getByUsername({ username: params.username });
    
    if (!user) {
      return {
        title: "用户不存在 - Tu",
      };
    }

    return {
      title: `${user.displayName || user.username} (@${user.username}) - Tu`,
      description: user.bio || `查看 ${user.displayName || user.username} 在 Tu 上的个人主页和作品`,
      openGraph: {
        title: `${user.displayName || user.username} (@${user.username})`,
        description: user.bio || `查看 ${user.displayName || user.username} 在 Tu 上的个人主页和作品`,
        images: user.avatarUrl ? [{ url: user.avatarUrl }] : [],
        type: "profile",
      },
      twitter: {
        card: "summary",
        title: `${user.displayName || user.username} (@${user.username})`,
        description: user.bio || `查看 ${user.displayName || user.username} 在 Tu 上的个人主页和作品`,
        images: user.avatarUrl ? [user.avatarUrl] : [],
      },
    };
  } catch {
    return {
      title: "用户不存在 - Tu",
    };
  }
}

export default async function UserPage({ params }: UserPageProps) {
  const session = await getServerAuthSession();
  
  try {
    const user = await api.user.getByUsername({ username: params.username });
    
    if (!user || !user.isActive) {
      notFound();
    }

    const isOwnProfile = session?.user?.id === user.id;

    // 检查访问权限
    if (user.profileVisibility === "PRIVATE" && !isOwnProfile) {
      notFound();
    }

    if (user.profileVisibility === "USERS_ONLY" && !session?.user) {
      notFound();
    }

    if (user.profileVisibility === "FOLLOWERS_ONLY" && !isOwnProfile) {
      // 检查是否为关注者
      if (session?.user) {
        const isFollowing = await api.user.isFollowing({
          userId: user.id
        });
        if (!isFollowing) {
          notFound();
        }
      } else {
        notFound();
      }
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Suspense fallback={<UserProfileSkeleton />}>
          <UserProfileClient 
            user={{
              ...user,
              socialLinks: user.socialLinks?.map(link => ({
                ...link,
                platform: link.platform as any, // 临时类型断言
                customTitle: link.customTitle || undefined,
                customIcon: link.customIcon || undefined
              })) || []
            }}
            isOwnProfile={isOwnProfile}
            currentUserId={session?.user?.id}
          />
        </Suspense>
      </div>
    );
  } catch (error) {
    console.error("Error loading user page:", error);
    notFound();
  }
}

// 加载骨架屏组件
function UserProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* 用户信息卡片骨架 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-64" />
            </div>
            <div className="flex gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="text-center">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12 mb-1" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 内容区域骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
