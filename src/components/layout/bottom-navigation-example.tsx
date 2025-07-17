/**
 * @fileoverview 底部导航栏使用示例
 * @description 展示如何使用和自定义底部导航栏组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * // 基本使用
 * import { BottomNavigationExample } from '@/components/layout/bottom-navigation-example';
 *
 * export default function App() {
 *   return <BottomNavigationExample />;
 * }
 *
 * @dependencies
 * - react: ^18.0.0
 * - lucide-react: ^0.263.1
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React, { useState } from "react";
import {
  Home,
  Search,
  MessageCircle,
  User,
  Heart,
  Camera,
  Settings,
  Bell
} from "lucide-react";
import { BottomNavigation } from "./BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { NavigationItem } from "@/types/navigation";

/**
 * 自定义导航项配置示例
 */
const CUSTOM_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "home",
    icon: Home,
    label: "首页",
    href: "/",
    requireAuth: false,
  },
  {
    id: "discover",
    icon: Search,
    label: "发现",
    href: "/discover",
    requireAuth: false,
  },
  {
    id: "camera",
    icon: Camera,
    label: "拍摄",
    href: "/camera",
    requireAuth: true,
    badge: 2, // 显示通知徽章
  },
  {
    id: "messages",
    icon: MessageCircle,
    label: "消息",
    href: "/messages",
    requireAuth: true,
    badge: 5,
  },
  {
    id: "profile",
    icon: User,
    label: "我的",
    href: "/profile",
    requireAuth: true,
  },
];

/**
 * 带权限控制的导航项示例
 */
const PERMISSION_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: "home",
    icon: Home,
    label: "首页",
    href: "/",
    requireAuth: false,
  },
  {
    id: "favorites",
    icon: Heart,
    label: "收藏",
    href: "/favorites",
    requireAuth: true,
  },
  {
    id: "notifications",
    icon: Bell,
    label: "通知",
    href: "/notifications",
    requireAuth: true,
    badge: 12,
  },
  {
    id: "settings",
    icon: Settings,
    label: "设置",
    href: "/settings",
    requireAuth: true,
  },
];

/**
 * 底部导航栏使用示例组件
 */
export function BottomNavigationExample() {
  const [currentExample, setCurrentExample] = useState<"default" | "custom" | "permission">("default");
  const [autoHide, setAutoHide] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("auto");

  // 处理导航事件
  const handleNavigate = (item: NavigationItem) => {
    console.log("导航到:", item.label, item.href);
    // 这里可以添加自定义导航逻辑
  };

  // 处理显示状态变化
  const handleVisibilityChange = (isVisible: boolean) => {
    console.log("导航栏可见性:", isVisible);
  };

  // 获取当前示例的导航项
  const getCurrentItems = () => {
    switch (currentExample) {
      case "custom":
        return CUSTOM_NAVIGATION_ITEMS;
      case "permission":
        return PERMISSION_NAVIGATION_ITEMS;
      default:
        return undefined; // 使用默认配置
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 标题 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">底部导航栏示例</h1>
          <p className="text-muted-foreground">
            展示不同配置和使用场景的底部导航栏
          </p>
        </div>

        {/* 配置面板 */}
        <Card>
          <CardHeader>
            <CardTitle>配置选项</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 示例选择 */}
            <div>
              <Label className="text-sm font-medium">示例类型</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={currentExample === "default" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentExample("default")}
                >
                  默认配置
                </Button>
                <Button
                  variant={currentExample === "custom" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentExample("custom")}
                >
                  自定义配置
                </Button>
                <Button
                  variant={currentExample === "permission" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentExample("permission")}
                >
                  权限控制
                </Button>
              </div>
            </div>

            {/* 功能开关 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-hide"
                  checked={autoHide}
                  onCheckedChange={setAutoHide}
                />
                <Label htmlFor="auto-hide">自动隐藏</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-labels"
                  checked={showLabels}
                  onCheckedChange={setShowLabels}
                />
                <Label htmlFor="show-labels">显示标签</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Label htmlFor="theme">主题:</Label>
                <select
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as "light" | "dark" | "auto")}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="auto">自动</option>
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">自动隐藏</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                滚动时自动隐藏导航栏，向上滚动时重新显示，提供更好的阅读体验。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">权限控制</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                根据用户登录状态和权限级别，动态显示或禁用导航项，确保安全性。
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">响应式设计</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                自适应不同屏幕尺寸，在移动端显示底部导航，桌面端自动隐藏。
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 代码示例 */}
        <Card>
          <CardHeader>
            <CardTitle>代码示例</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
              <code>{`// 基本使用
import { BottomNavigation } from '@/components/layout/BottomNavigation';

export default function App() {
  return (
    <BottomNavigation
      autoHide={${autoHide}}
      showLabels={${showLabels}}
      theme="${theme}"
      onNavigate={(item) => console.log('导航到:', item.label)}
      onVisibilityChange={(isVisible) => console.log('可见性:', isVisible)}
    />
  );
}`}</code>
            </pre>
          </CardContent>
        </Card>

        {/* 滚动测试内容 */}
        <Card>
          <CardHeader>
            <CardTitle>滚动测试</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              向下滚动测试自动隐藏功能，向上滚动查看重新显示效果。
            </p>
            <div className="space-y-4">
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium">测试内容 {i + 1}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    这是用于测试滚动效果的内容。当你向下滚动时，底部导航栏会自动隐藏；
                    当你向上滚动时，导航栏会重新显示。这种设计可以为用户提供更好的阅读体验。
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 底部导航栏 */}
      <BottomNavigation
        items={getCurrentItems()}
        autoHide={autoHide}
        showLabels={showLabels}
        theme={theme}
        onNavigate={handleNavigate}
        onVisibilityChange={handleVisibilityChange}
      />
    </div>
  );
}
