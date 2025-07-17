/**
 * @fileoverview UserCard 组件测试页面
 * @description 展示 UserCard 组件的各种使用场景和配置选项
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - UserCard component
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCard, type UserCardData } from "@/components/ui/user-card";
import { Separator } from "@/components/ui/separator";

export default function UserCardTestPage() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // 测试用户数据
  const testUsers: UserCardData[] = [
    {
      id: "1",
      username: "sakura_cosplay",
      displayName: "小樱 Cosplay",
      bio: "专业cosplayer，擅长动漫角色扮演，已有5年经验。喜欢分享cosplay制作过程和心得。",
      avatarUrl: "https://picsum.photos/200/200?random=1",
      userLevel: "VERIFIED",
      isVerified: true,
      followersCount: 12500,
      followingCount: 890,
      likeCount: 45600,
      postsCount: 234,
      socialLinks: [
        {
          platform: "WEIBO",
          username: "sakura_cos",
          url: "https://weibo.com/sakura_cos",
          isPublic: true,
        },
        {
          platform: "INSTAGRAM",
          username: "sakura.cosplay",
          url: "https://instagram.com/sakura.cosplay",
          isPublic: true,
        },
        {
          platform: "TWITTER",
          username: "sakura_cos",
          url: "https://twitter.com/sakura_cos",
          isPublic: true,
        },
      ],
    },
    {
      id: "2",
      username: "admin",
      displayName: "管理员",
      bio: "Tu平台管理员账户",
      avatarUrl: "https://picsum.photos/200/200?random=2",
      userLevel: "ADMIN",
      isVerified: true,
      followersCount: 50000,
      followingCount: 100,
      likeCount: 120000,
      postsCount: 50,
      socialLinks: [
        {
          platform: "TELEGRAM",
          username: "tu_admin",
          url: "https://t.me/tu_admin",
          isPublic: true,
        },
      ],
    },
    {
      id: "3",
      username: "newbie_user",
      displayName: "新手用户",
      bio: "刚加入Tu平台的新用户，正在学习cosplay",
      avatarUrl: null,
      userLevel: "USER",
      isVerified: false,
      followersCount: 25,
      followingCount: 150,
      likeCount: 89,
      postsCount: 5,
      socialLinks: [],
    },
    {
      id: "4",
      username: "premium_member",
      displayName: "高级会员",
      bio: "Tu平台高级会员，享受专属内容和服务",
      avatarUrl: "https://picsum.photos/200/200?random=4",
      userLevel: "PREMIUM",
      isVerified: false,
      followersCount: 3200,
      followingCount: 450,
      likeCount: 8900,
      postsCount: 78,
      socialLinks: [
        {
          platform: "BILIBILI",
          username: "premium_cos",
          url: "https://space.bilibili.com/premium_cos",
          isPublic: true,
        },
        {
          platform: "YOUTUBE",
          username: "premium_cosplay",
          url: "https://youtube.com/@premium_cosplay",
          isPublic: true,
        },
      ],
    },
  ];

  const handleUserClick = (username: string) => {
    setSelectedUser(username);
    console.log(`点击了用户: ${username}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">UserCard 组件测试</h1>
        <p className="text-muted-foreground">
          展示 UserCard 组件的各种尺寸、变体和配置选项
        </p>
      </div>

      {/* 选中用户提示 */}
      {selectedUser && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <p className="text-blue-800 dark:text-blue-200">
              <strong>已选中用户:</strong> {selectedUser}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedUser(null)}
              className="mt-2"
            >
              清除选择
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 不同尺寸展示 */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">不同尺寸 (Size)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">小尺寸 (sm)</h3>
            <UserCard
              user={testUsers[0]}
              size="sm"
              onClick={() => handleUserClick(testUsers[0].username)}
            />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">中等尺寸 (md)</h3>
            <UserCard
              user={testUsers[0]}
              size="md"
              onClick={() => handleUserClick(testUsers[0].username)}
            />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">大尺寸 (lg)</h3>
            <UserCard
              user={testUsers[0]}
              size="lg"
              onClick={() => handleUserClick(testUsers[0].username)}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* 不同变体展示 */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">不同变体 (Variant)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">紧凑布局 (compact)</h3>
            <div className="space-y-3">
              {testUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  variant="compact"
                  size="sm"
                  onClick={() => handleUserClick(user.username)}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">默认布局 (default)</h3>
            <div className="space-y-3">
              {testUsers.slice(0, 2).map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  variant="default"
                  onClick={() => handleUserClick(user.username)}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">详细布局 (detailed)</h3>
            <div className="space-y-3">
              {testUsers.slice(0, 2).map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  variant="detailed"
                  onClick={() => handleUserClick(user.username)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* 功能选项展示 */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">功能选项</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">隐藏统计数据</h3>
            <UserCard
              user={testUsers[0]}
              showStats={false}
              onClick={() => handleUserClick(testUsers[0].username)}
            />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">隐藏社交链接</h3>
            <UserCard
              user={testUsers[0]}
              showSocialLinks={false}
              onClick={() => handleUserClick(testUsers[0].username)}
            />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">不可点击</h3>
            <UserCard
              user={testUsers[0]}
              clickable={false}
            />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-3">自定义样式</h3>
            <UserCard
              user={testUsers[1]}
              className="border-2 border-red-200 bg-red-50 dark:bg-red-950"
              onClick={() => handleUserClick(testUsers[1].username)}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* 不同用户等级展示 */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">不同用户等级</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testUsers.map((user) => (
            <div key={user.id}>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                {user.displayName}
                <Badge variant="outline">{user.userLevel}</Badge>
              </h3>
              <UserCard
                user={user}
                variant="compact"
                onClick={() => handleUserClick(user.username)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 使用说明 */}
      <section className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>使用说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">组件属性:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li><code>size</code>: &lsquo;sm&rsquo; | &lsquo;md&rsquo; | &lsquo;lg&rsquo; - 控制卡片尺寸</li>
                <li><code>variant</code>: &lsquo;default&rsquo; | &lsquo;compact&rsquo; | &lsquo;detailed&rsquo; - 控制布局样式</li>
                <li><code>showSocialLinks</code>: boolean - 是否显示社交链接</li>
                <li><code>showStats</code>: boolean - 是否显示统计数据</li>
                <li><code>clickable</code>: boolean - 是否可点击跳转</li>
                <li><code>onClick</code>: function - 自定义点击事件</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">使用场景:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>个人主页展示</li>
                <li>点击头像时的弹出卡片</li>
                <li>点击用户名时的快速预览</li>
                <li>评论区用户信息展示</li>
                <li>搜索结果中的用户卡片</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
