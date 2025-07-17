/**
 * @fileoverview UserCardDialog 和 ClickableUserInfo 组件测试页面
 * @description 测试用户名片弹窗和可点击用户信息组件的功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - UserCardDialog component
 * - ClickableUserInfo component
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ClickableUserInfo, 
  AuthorInfo, 
  CommenterInfo, 
  CompactUserInfo,
  VerticalUserInfo,
  type UserInfo 
} from "@/components/ui/clickable-user-info";
import { UserCardDialog, useUserCardDialog } from "@/components/ui/user-card-dialog";
import { CommentSection } from "@/components/post/comment-section";

export default function UserCardDialogTestPage() {
  const { isOpen, selectedUsername, openDialog, closeDialog } = useUserCardDialog();
  const [testScenario, setTestScenario] = useState("basic");

  // 测试用户数据
  const testUsers: UserInfo[] = [
    {
      id: "1",
      username: "sakura_cosplay",
      displayName: "小樱 Cosplay",
      avatarUrl: "https://picsum.photos/200/200?random=1",
      userLevel: "VERIFIED",
      isVerified: true,
    },
    {
      id: "2",
      username: "admin",
      displayName: "管理员",
      avatarUrl: "https://picsum.photos/200/200?random=2",
      userLevel: "ADMIN",
      isVerified: true,
    },
    {
      id: "3",
      username: "newbie_user",
      displayName: "新手用户",
      avatarUrl: null,
      userLevel: "USER",
      isVerified: false,
    },
    {
      id: "4",
      username: "premium_member",
      displayName: "高级会员",
      avatarUrl: "https://picsum.photos/200/200?random=4",
      userLevel: "PREMIUM",
      isVerified: false,
    },
  ];

  const scenarios = [
    { id: "basic", name: "基础功能测试" },
    { id: "author", name: "作者信息展示" },
    { id: "commenter", name: "评论者信息" },
    { id: "compact", name: "紧凑布局" },
    { id: "vertical", name: "垂直布局" },
    { id: "comment-section", name: "评论区演示" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">用户名片弹窗测试</h1>
        <p className="text-muted-foreground">
          测试 UserCardDialog 和 ClickableUserInfo 组件的功能
        </p>
      </div>

      {/* 场景选择器 */}
      <div className="flex flex-wrap justify-center gap-2">
        {scenarios.map((scenario) => (
          <Button
            key={scenario.id}
            variant={testScenario === scenario.id ? "default" : "outline"}
            size="sm"
            onClick={() => setTestScenario(scenario.id)}
          >
            {scenario.name}
          </Button>
        ))}
      </div>

      {/* 基础功能测试 */}
      {testScenario === "basic" && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">基础功能测试</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>直接触发弹窗</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {testUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant="outline"
                    onClick={() => openDialog(user.username)}
                    className="w-full justify-start"
                  >
                    查看 {user.displayName || user.username} 的信息
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>可点击用户信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {testUsers.map((user) => (
                  <div key={user.id} className="p-3 border rounded-lg">
                    <ClickableUserInfo
                      user={user}
                      size="md"
                      showDisplayName={true}
                      showUsername={true}
                      showAvatar={true}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* 作者信息展示 */}
      {testScenario === "author" && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">作者信息展示（帖子详情页样式）</h2>
          <div className="space-y-4">
            {testUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AuthorInfo user={user} />
                      <div className="ml-2">
                        <p className="text-sm text-gray-500">
                          2小时前发布
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        关注
                      </Button>
                      <Button variant="ghost" size="sm">
                        分享
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 评论者信息 */}
      {testScenario === "commenter" && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">评论者信息（评论区样式）</h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              {testUsers.map((user, index) => (
                <div key={user.id} className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CommenterInfo user={user} />
                        <span className="text-xs text-gray-500">
                          {index + 1}小时前
                        </span>
                      </div>
                      <p className="text-gray-800 leading-relaxed">
                        这是一条来自 {user.displayName || user.username} 的评论内容，
                        展示了评论区中用户信息的显示效果。点击头像或用户名可以查看详细信息。
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <button className="hover:text-red-500">点赞 (5)</button>
                        <button className="hover:text-blue-500">回复</button>
                      </div>
                    </div>
                  </div>
                  {index < testUsers.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* 紧凑布局 */}
      {testScenario === "compact" && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">紧凑布局（列表样式）</h2>
          <Card>
            <CardHeader>
              <CardTitle>用户列表</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {testUsers.map((user, index) => (
                <div key={user.id}>
                  <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <CompactUserInfo user={user} />
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {user.userLevel}
                      </Badge>
                      <Button variant="outline" size="sm">
                        关注
                      </Button>
                    </div>
                  </div>
                  {index < testUsers.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* 垂直布局 */}
      {testScenario === "vertical" && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">垂直布局（卡片样式）</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testUsers.map((user) => (
              <Card key={user.id} className="text-center">
                <CardContent className="p-6">
                  <VerticalUserInfo user={user} />
                  <div className="mt-4 space-y-2">
                    <Button className="w-full" size="sm">
                      关注
                    </Button>
                    <Button variant="outline" className="w-full" size="sm">
                      发消息
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 评论区演示 */}
      {testScenario === "comment-section" && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">评论区完整演示</h2>
          <CommentSection 
            postId="test_post_123"
            commentCount={15}
          />
        </section>
      )}

      {/* 用户名片弹窗 */}
      <UserCardDialog
        username={selectedUsername}
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog();
          }
        }}
      />

      {/* 使用说明 */}
      <section className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>功能说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">主要功能:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>点击用户头像或用户名显示用户名片弹窗</li>
                <li>弹窗中显示用户详细信息、统计数据和社交链接</li>
                <li>支持跳转到用户主页</li>
                <li>多种布局样式适应不同使用场景</li>
                <li>响应式设计，移动端和桌面端都有良好体验</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">组件类型:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><code>AuthorInfo</code>: 适用于帖子详情页的作者信息</li>
                <li><code>CommenterInfo</code>: 适用于评论区的评论者信息</li>
                <li><code>CompactUserInfo</code>: 适用于列表的紧凑用户信息</li>
                <li><code>VerticalUserInfo</code>: 适用于卡片的垂直用户信息</li>
                <li><code>ClickableUserInfo</code>: 通用的可点击用户信息组件</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
