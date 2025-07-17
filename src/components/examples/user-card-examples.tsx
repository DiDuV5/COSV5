/**
 * @fileoverview UserCard 组件使用示例
 * @description 展示 UserCard 组件在实际场景中的使用方法
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
import { UserCard, type UserCardData } from "@/components/ui/user-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 示例用户数据
const exampleUser: UserCardData = {
  id: "example-user-1",
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
};

// 1. 个人主页展示示例
export function ProfilePageExample() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">个人主页展示</h2>
      <UserCard
        user={exampleUser}
        size="lg"
        variant="detailed"
        showSocialLinks={true}
        showStats={true}
        clickable={false}
      />
    </div>
  );
}

// 2. 弹出卡片示例 - 优化后的简洁版本
export function PopupCardExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">弹出卡片示例</h2>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            点击查看用户信息
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg border-0 shadow-xl p-0">
          {/* 移除标题，创建更简洁的布局 */}
          <div className="p-6">
            <UserCard
              user={exampleUser}
              size="md"
              variant="default"
              showSocialLinks={true}
              showStats={true}
              clickable={false}
              className="border-0 shadow-none bg-transparent p-0"
            />

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
              <Button
                onClick={() => setIsOpen(false)}
                className="flex-1 h-11 font-medium transition-all duration-200 hover:scale-[1.02]"
              >
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 3. 评论区用户信息示例
export function CommentUserExample() {
  const commentUsers = [
    { ...exampleUser, id: "1", username: "user1", displayName: "用户1" },
    { ...exampleUser, id: "2", username: "user2", displayName: "用户2", userLevel: "USER" },
    { ...exampleUser, id: "3", username: "user3", displayName: "用户3", userLevel: "PREMIUM" },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">评论区用户信息</h2>
      <div className="space-y-4">
        {commentUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <UserCard
                user={user}
                size="sm"
                variant="compact"
                showStats={false}
                showSocialLinks={false}
                onClick={() => console.log(`点击了用户: ${user.username}`)}
              />
              <div className="mt-3 pl-14">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  这是一条评论内容，展示用户在评论区的信息显示效果。
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>2小时前</span>
                  <button className="hover:text-blue-500">回复</button>
                  <button className="hover:text-red-500">点赞</button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 4. 搜索结果列表示例
export function SearchResultsExample() {
  const searchResults = [
    { ...exampleUser, id: "1", username: "sakura_cos", displayName: "小樱 Cosplay" },
    { ...exampleUser, id: "2", username: "admin", displayName: "管理员", userLevel: "ADMIN" },
    { ...exampleUser, id: "3", username: "newbie", displayName: "新手用户", userLevel: "USER", isVerified: false },
    { ...exampleUser, id: "4", username: "premium_user", displayName: "高级用户", userLevel: "PREMIUM" },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">搜索结果列表</h2>
      <div className="space-y-3">
        {searchResults.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            size="md"
            variant="compact"
            showSocialLinks={false}
            showStats={true}
            onClick={() => console.log(`查看用户: ${user.username}`)}
          />
        ))}
      </div>
    </div>
  );
}

// 5. 关注者/粉丝列表示例
export function FollowersListExample() {
  const followers = [
    { ...exampleUser, id: "1", username: "follower1", displayName: "粉丝1" },
    { ...exampleUser, id: "2", username: "follower2", displayName: "粉丝2" },
    { ...exampleUser, id: "3", username: "follower3", displayName: "粉丝3" },
  ];

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">关注者列表</h2>
      <div className="space-y-3">
        {followers.map((user) => (
          <div key={user.id} className="flex items-center justify-between">
            <div className="flex-1">
              <UserCard
                user={user}
                size="sm"
                variant="compact"
                showStats={false}
                showSocialLinks={false}
                onClick={() => console.log(`查看用户: ${user.username}`)}
              />
            </div>
            <Button variant="outline" size="sm" className="ml-3">
              关注
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. 侧边栏推荐用户示例
export function SidebarRecommendationsExample() {
  const recommendedUsers = [
    { ...exampleUser, id: "1", username: "rec1", displayName: "推荐用户1" },
    { ...exampleUser, id: "2", username: "rec2", displayName: "推荐用户2" },
    { ...exampleUser, id: "3", username: "rec3", displayName: "推荐用户3" },
  ];

  return (
    <div className="max-w-sm mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">推荐关注</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendedUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              size="sm"
              variant="compact"
              showStats={false}
              showSocialLinks={false}
              onClick={() => console.log(`查看推荐用户: ${user.username}`)}
            />
          ))}
          <Button variant="link" className="w-full text-sm">
            查看更多推荐
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// 7. 响应式网格布局示例
export function ResponsiveGridExample() {
  const users = Array.from({ length: 6 }, (_, i) => ({
    ...exampleUser,
    id: `grid-user-${i}`,
    username: `user${i + 1}`,
    displayName: `用户 ${i + 1}`,
    userLevel: ["USER", "PREMIUM", "VERIFIED", "ADMIN"][i % 4],
  }));

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">响应式网格布局</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            size="md"
            variant="default"
            showSocialLinks={true}
            showStats={true}
            onClick={() => console.log(`查看用户: ${user.username}`)}
          />
        ))}
      </div>
    </div>
  );
}

// 主要示例组件
export function UserCardExamples() {
  const [activeExample, setActiveExample] = useState("profile");

  const examples = [
    { id: "profile", name: "个人主页", component: ProfilePageExample },
    { id: "popup", name: "弹出卡片", component: PopupCardExample },
    { id: "comments", name: "评论区", component: CommentUserExample },
    { id: "search", name: "搜索结果", component: SearchResultsExample },
    { id: "followers", name: "关注者列表", component: FollowersListExample },
    { id: "sidebar", name: "侧边栏推荐", component: SidebarRecommendationsExample },
    { id: "grid", name: "网格布局", component: ResponsiveGridExample },
  ];

  const ActiveComponent = examples.find(ex => ex.id === activeExample)?.component || ProfilePageExample;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">UserCard 组件使用示例</h1>
          <p className="text-gray-600 dark:text-gray-400">
            展示 UserCard 组件在不同场景下的实际应用
          </p>
        </div>

        {/* 示例选择器 */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {examples.map((example) => (
            <Button
              key={example.id}
              variant={activeExample === example.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveExample(example.id)}
            >
              {example.name}
            </Button>
          ))}
        </div>

        {/* 示例内容 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
