/**
 * @fileoverview 通知列表组件
 * @description 显示用户通知列表
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/trpc/react";
import {
  Bell,
  Heart,
  MessageSquare,
  UserPlus,
  AtSign,
  Star,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  Trash2,
  Check
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { NotificationType, NotificationPriority } from "@/types/notification-types";

interface NotificationListProps {
  className?: string;
  limit?: number;
  showUnreadOnly?: boolean;
}

export function NotificationList({ 
  className, 
  limit = 20, 
  showUnreadOnly = false 
}: NotificationListProps) {
  const { toast } = useToast();

  // 获取通知列表
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch 
  } = api.notification.getNotifications.useInfiniteQuery(
    { 
      limit,
      unreadOnly: showUnreadOnly,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // 标记已读
  const markAsRead = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast({
        title: "操作失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 删除通知
  const deleteNotification = api.notification.deleteNotification.useMutation({
    onSuccess: () => {
      toast({
        title: "删除成功",
        description: "通知已删除",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const notifications = data?.pages.flatMap(page => page.notifications) || [];

  // 获取通知图标
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.LIKE:
        return <Heart className="h-4 w-4 text-red-500" />;
      case NotificationType.COMMENT:
      case NotificationType.REPLY:
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case NotificationType.FOLLOW:
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case NotificationType.MENTION:
        return <AtSign className="h-4 w-4 text-purple-500" />;
      case NotificationType.POST_FEATURED:
        return <Star className="h-4 w-4 text-yellow-500" />;
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return <Info className="h-4 w-4 text-blue-600" />;
      case NotificationType.SYSTEM_MAINTENANCE:
      case NotificationType.ACCOUNT_SECURITY:
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case NotificationType.POST_APPROVED:
      case NotificationType.LEVEL_UPGRADE:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return "bg-red-100 text-red-800 border-red-200";
      case NotificationPriority.IMPORTANT:
        return "bg-orange-100 text-orange-800 border-orange-200";
      case NotificationPriority.NORMAL:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case NotificationPriority.LOW:
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // 处理通知点击
  const handleNotificationClick = async (notification: any) => {
    // 如果未读，标记为已读
    if (!notification.isRead) {
      await markAsRead.mutateAsync({
        notificationIds: [notification.id],
      });
    }

    // 如果有操作链接，跳转
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  // 标记所有为已读
  const handleMarkAllAsRead = async () => {
    await markAsRead.mutateAsync({
      markAll: true,
    });
  };

  if (notifications.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">暂无通知</h3>
          <p className="text-muted-foreground text-center">
            {showUnreadOnly ? "没有未读通知" : "还没有收到任何通知"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {showUnreadOnly ? "未读通知" : "所有通知"}
          {notifications.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {notifications.length}
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAsRead.isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            全部已读
          </Button>
        </div>
      </div>

      {/* 通知列表 */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <Card 
            key={notification.id}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              !notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50/30' : ''
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* 通知图标 */}
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type as NotificationType)}
                </div>

                {/* 通知内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground mb-1">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.content}
                      </p>
                    </div>

                    {/* 优先级标签 */}
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPriorityColor(notification.priority as NotificationPriority)}`}
                    >
                      {notification.priority === NotificationPriority.URGENT && "紧急"}
                      {notification.priority === NotificationPriority.IMPORTANT && "重要"}
                      {notification.priority === NotificationPriority.NORMAL && "普通"}
                      {notification.priority === NotificationPriority.LOW && "提醒"}
                    </Badge>
                  </div>

                  {/* 时间和操作 */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                      {!notification.isRead && (
                        <Badge variant="secondary" className="text-xs">
                          未读
                        </Badge>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification.mutate({ notificationId: notification.id });
                      }}
                      disabled={deleteNotification.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 加载更多 */}
      {hasNextPage && (
        <div className="flex justify-center pt-4">
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
  );
}
