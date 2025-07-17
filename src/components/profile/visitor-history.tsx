/**
 * @component VisitorHistory
 * @description 个人主页访客记录展示组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - profileId: string - 用户ID
 * - isOwnProfile: boolean - 是否为用户自己的主页
 * - className?: string - 自定义样式类名
 *
 * @example
 * <VisitorHistory
 *   profileId="user123"
 *   isOwnProfile={true}
 *   className="mt-4"
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - shadcn/ui components
 * - lucide-react icons
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Eye,
  Users,
  Heart,
  UserPlus,
  User,
  Filter,
  Trash2,
  MoreHorizontal,
  Shield
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { api } from "@/trpc/react";
import { VISITOR_TYPES, type VisitorType } from "@/types/profile";
import { cn } from "@/lib/utils";

interface VisitorHistoryProps {
  profileId: string;
  isOwnProfile: boolean;
  className?: string;
}

export function VisitorHistory({ profileId, isOwnProfile, className }: VisitorHistoryProps) {
  const [filterType, setFilterType] = useState<VisitorType | "ALL">("ALL");
  const [showClearDialog, setShowClearDialog] = useState(false);

  const {
    data: visitorsData,
    isPending,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = api.profile.getVisitors.useInfiniteQuery(
    {
      profileId,
      type: filterType,
      limit: 10,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: isOwnProfile, // 只有用户本人可以查看访客记录
    }
  );

  const { data: visitorStats } = api.profile.getVisitorStats.useQuery(
    { profileId },
    { enabled: isOwnProfile }
  );

  const clearVisitorsMutation = api.profile.clearVisitors.useMutation({
    onSuccess: () => {
      // 刷新数据
      window.location.reload();
    },
  });

  const visitors = visitorsData?.pages.flatMap((page) => page.visitors) ?? [];

  const handleClearVisitors = () => {
    clearVisitorsMutation.mutate({
      profileId,
      type: filterType,
    });
    setShowClearDialog(false);
  };

  const getVisitorTypeIcon = (type: VisitorType) => {
    switch (type) {
      case "GUEST":
        return <User className="h-4 w-4" />;
      case "USER":
        return <Users className="h-4 w-4" />;
      case "FOLLOWER":
        return <Heart className="h-4 w-4" />;
      case "FOLLOWING":
        return <UserPlus className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  // 安全访问VISITOR_TYPES的辅助函数
  const getVisitorTypeConfig = (type: string) => {
    return VISITOR_TYPES[type as VisitorType] || { name: '未知', color: '#6b7280' };
  };

  if (!isOwnProfile) {
    return null; // 非本人不显示访客记录
  }

  if (isPending) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>访客记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">加载访客记录时出错</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              访客记录
              {visitorStats && (
                <Badge variant="secondary">
                  {visitorStats.totalVisitors}
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={(value) => setFilterType(value as VisitorType | "ALL")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">全部</SelectItem>
                  <SelectItem value="GUEST">游客</SelectItem>
                  <SelectItem value="USER">用户</SelectItem>
                  <SelectItem value="FOLLOWER">粉丝</SelectItem>
                  <SelectItem value="FOLLOWING">关注</SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setShowClearDialog(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    清除记录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 访客统计 */}
          {visitorStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-lg font-semibold">{visitorStats.breakdown.guest}</div>
                <div className="text-sm text-gray-500">游客</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-lg font-semibold">{visitorStats.breakdown.user}</div>
                <div className="text-sm text-gray-500">用户</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-lg font-semibold">{visitorStats.breakdown.follower}</div>
                <div className="text-sm text-gray-500">粉丝</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-lg font-semibold">{visitorStats.breakdown.following}</div>
                <div className="text-sm text-gray-500">关注</div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {visitors.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {filterType === "ALL" ? "暂无访客记录" : `暂无${getVisitorTypeConfig(filterType).name}访客`}
            </p>
          ) : (
            <div className="space-y-3">
              {visitors.map((visitor) => (
                <div
                  key={visitor.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {visitor.visitor ? (
                    <Link href={`/users/${visitor.visitor.username}`}>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={visitor.visitor.avatarUrl || undefined} />
                        <AvatarFallback>
                          {(visitor.visitor.displayName || visitor.visitor.username).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {visitor.visitor ? (
                      <Link
                        href={`/users/${visitor.visitor.username}`}
                        className="font-medium hover:text-blue-500 transition-colors"
                      >
                        {visitor.visitor.displayName || visitor.visitor.username}
                        {visitor.visitor.isVerified && (
                          <Shield className="inline h-3 w-3 ml-1 text-blue-500" />
                        )}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-500">游客</span>
                    )}
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(visitor.visitedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                    style={{
                      backgroundColor: getVisitorTypeConfig(visitor.visitorType).color + '20',
                      color: getVisitorTypeConfig(visitor.visitorType).color,
                    }}
                  >
                    {getVisitorTypeIcon(visitor.visitorType as VisitorType)}
                    {getVisitorTypeConfig(visitor.visitorType).name}
                  </Badge>
                </div>
              ))}

              {hasNextPage && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "加载中..." : "加载更多"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 清除访客记录确认对话框 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清除访客记录</AlertDialogTitle>
            <AlertDialogDescription>
              {filterType === "ALL"
                ? "这将清除所有访客记录，此操作无法撤销。"
                : `这将清除所有${getVisitorTypeConfig(filterType).name}访客记录，此操作无法撤销。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearVisitors}
              className="bg-red-600 hover:bg-red-700"
              disabled={clearVisitorsMutation.isPending}
            >
              {clearVisitorsMutation.isPending ? "清除中..." : "确认清除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
