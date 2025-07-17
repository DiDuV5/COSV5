/**
 * @fileoverview 互动页面
 * @description 用户互动中心，包含发布功能、通知、记录等
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - next-auth: ^4.24.0
 * - @trpc/react-query: ^10.45.0
 * - lucide-react: ^0.263.1
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  MessageCircle,
  Plus,
  Bell,
  Heart,
  Eye,
  MessageSquare,
  Clock,
  User,
  Camera,
  Edit3,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MainNav } from "@/components/layout/main-nav";
import { NotificationList } from "@/components/notifications/notification-list";
import { NotificationPreferences } from "@/components/settings/notification-preferences";
import { api } from "@/trpc/react";

export default function InteractPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("publish");
  const [notificationTab, setNotificationTab] = useState("all");

  // 获取未读通知数量
  const { data: unreadCount } = api.notification.getUnreadCount.useQuery(
    undefined,
    { enabled: !!session }
  );

  // 如果未登录，显示登录提示
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <MainNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md">
              <CardContent className="p-8 text-center">
                <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-4">需要登录</h2>
                <p className="text-muted-foreground mb-6">
                  请登录后使用互动功能
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/auth/signin" className="flex-1">
                    <Button className="w-full">登录</Button>
                  </Link>
                  <Link href="/auth/signup" className="flex-1">
                    <Button variant="outline" className="w-full">注册</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      
      <div className="container mx-auto px-4 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <MessageCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">互动中心</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            发布内容、查看通知、管理互动记录
          </p>
        </div>

        {/* 互动标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="publish" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>发布</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2 relative">
              <Bell className="h-4 w-4" />
              <span>通知</span>
              {unreadCount && unreadCount.count > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {unreadCount.count > 99 ? '99+' : unreadCount.count}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>动态</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>记录</span>
            </TabsTrigger>
          </TabsList>

          {/* 发布内容 */}
          <TabsContent value="publish" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 发布作品 */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/create">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">发布作品</h3>
                    <p className="text-muted-foreground mb-4">
                      分享你的 Cosplay 作品和写真
                    </p>
                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      开始创作
                    </Button>
                  </CardContent>
                </Link>
              </Card>

              {/* 发布动态 */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/moments/create">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Edit3 className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">发布动态</h3>
                    <p className="text-muted-foreground mb-4">
                      分享生活点滴和创作过程
                    </p>
                    <Button variant="outline" className="w-full">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      发布动态
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            </div>

            {/* 快速统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">12</div>
                  <div className="text-sm text-muted-foreground">已发布作品</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">28</div>
                  <div className="text-sm text-muted-foreground">发布动态</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">156</div>
                  <div className="text-sm text-muted-foreground">获得点赞</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">89</div>
                  <div className="text-sm text-muted-foreground">收到评论</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 通知中心 */}
          <TabsContent value="notifications" className="mt-6">
            <Tabs value={notificationTab} onValueChange={setNotificationTab}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">通知中心</h2>
                <div className="flex items-center gap-2">
                  <TabsList>
                    <TabsTrigger value="all">全部通知</TabsTrigger>
                    <TabsTrigger value="unread">
                      未读通知
                      {unreadCount && unreadCount.count > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                          {unreadCount.count}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                      <Settings className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value="all">
                <NotificationList showUnreadOnly={false} />
              </TabsContent>

              <TabsContent value="unread">
                <NotificationList showUnreadOnly={true} />
              </TabsContent>

              <TabsContent value="settings">
                <NotificationPreferences />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* 活动记录 */}
          <TabsContent value="activity" className="mt-6">
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">活动记录</h3>
              <p className="text-muted-foreground">
                功能开发中，敬请期待
              </p>
            </div>
          </TabsContent>

          {/* 浏览记录 */}
          <TabsContent value="records" className="mt-6">
            <div className="text-center py-12">
              <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">浏览记录</h3>
              <p className="text-muted-foreground">
                功能开发中，敬请期待
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
