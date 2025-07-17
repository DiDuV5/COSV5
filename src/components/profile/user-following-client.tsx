/**
 * @component UserFollowingClient
 * @description 用户关注列表客户端组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - user: object - 用户信息对象
 *
 * @example
 * <UserFollowingClient user={user} />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 * - shadcn/ui components
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { UnifiedAvatar } from "@/components/ui/unified-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { Search, Users, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
  _count?: {
    followers: number;
    following: number;
    posts: number;
  };
}

interface UserFollowingClientProps {
  user: User;
}

export function UserFollowingClient({ user }: UserFollowingClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // 暂时禁用关注列表API调用，使用模拟数据
  const followingData = { following: [] };
  const isPending = false;

  // 获取关注列表数组
  const followingList = followingData?.following || [];

  // 过滤搜索结果
  const filteredFollowing = followingList.filter((followedUser: any) =>
    (followedUser.displayName || followedUser.username)
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  if (isPending) {
    return (
      <div className="space-y-4">
        {/* 加载骨架屏 */}
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="搜索关注的用户..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Users className="h-4 w-4" />
        <span>
          共关注 {followingList.length} 位用户
          {searchQuery && ` (筛选出 ${filteredFollowing.length} 位)`}
        </span>
      </div>

      {/* 关注列表 */}
      {filteredFollowing.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? "没有找到匹配的用户" : "还没有关注任何人"}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? "尝试使用不同的关键词搜索" 
                : `${user.displayName || user.username} 还没有关注任何用户`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredFollowing.map((followedUser: any) => (
            <Card key={followedUser.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Link href={`/users/${followedUser.username}`}>
                      <UnifiedAvatar
                        user={{
                          username: followedUser.username,
                          displayName: followedUser.displayName,
                          avatarUrl: followedUser.avatarUrl,
                          isVerified: followedUser.isVerified,
                          userLevel: followedUser.userLevel,
                        }}
                        size="md"
                        showVerifiedBadge={true}
                        fallbackType="initials"
                        className="cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                      />
                    </Link>
                    
                    <div className="flex-1">
                      <Link 
                        href={`/users/${followedUser.username}`}
                        className="block hover:underline"
                      >
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {followedUser.displayName || followedUser.username}
                        </h3>
                        <p className="text-sm text-gray-500">
                          @{followedUser.username}
                        </p>
                      </Link>
                      
                      {followedUser.bio && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {followedUser.bio}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{followedUser._count?.posts || followedUser.postsCount || 0} 作品</span>
                        <span>{followedUser._count?.followers || followedUser.followersCount || 0} 关注者</span>
                        <span>{followedUser._count?.following || followedUser.followingCount || 0} 关注</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={`/users/${followedUser.username}`}>
                        查看主页
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 分页 - 如果需要的话 */}
      {filteredFollowing.length > 0 && (
        <div className="flex justify-center pt-6">
          <p className="text-sm text-gray-500">
            已显示所有关注的用户
          </p>
        </div>
      )}
    </div>
  );
}
