/**
 * @fileoverview 管理后台布局组件
 * @description 管理后台的统一布局，包含侧边栏导航和权限检查
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - next-auth: ^4.24.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Settings,
  Users,
  FileText,
  MessageSquare,
  BarChart3,
  Shield,
  Home,
  LogOut,
  Menu,
  X,
  TestTube,
  Tag,
  Star,
  Coins,
  Trash2,
  HardDrive,
  Cloud,
  UserCheck,
  Mail,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  {
    title: "概览",
    href: "/admin",
    icon: BarChart3,
  },
  {
    title: "首页管理",
    href: "/admin/featured",
    icon: Star,
  },
  {
    title: "用户管理",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "用户组管理",
    href: "/admin/user-groups",
    icon: Users,
  },
  {
    title: "用户审核",
    href: "/admin/user-approval",
    icon: UserCheck,
  },
  {
    title: "内容管理",
    href: "/admin/posts",
    icon: FileText,
  },
  {
    title: "已删除内容",
    href: "/admin/deleted-posts",
    icon: Trash2,
  },
  {
    title: "评论管理",
    href: "/admin/comments",
    icon: MessageSquare,
  },
  {
    title: "标签管理",
    href: "/admin/tags",
    icon: Tag,
  },
  {
    title: "罐头系统",
    href: "/admin/cans",
    icon: Coins,
  },
  {
    title: "文件清理",
    href: "/admin/cleanup",
    icon: Trash2,
  },
  {
    title: "邮箱管理",
    href: "/admin/email-management",
    icon: Mail,
  },
  {
    title: "存储管理",
    href: "/admin/storage",
    icon: HardDrive,
  },
  {
    title: "对象存储",
    href: "/admin/object-storage",
    icon: Cloud,
  },
  {
    title: "性能监控",
    href: "/admin/performance-monitoring",
    icon: Activity,
  },
  {
    title: "系统设置",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    title: "系统测试",
    href: "/admin/tests",
    icon: TestTube,
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/signin?callbackUrl=/admin");
      return;
    }

    // 检查用户是否有管理员权限
    if (session.user.userLevel !== "ADMIN" && session.user.userLevel !== "SUPER_ADMIN") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || (session.user.userLevel !== "ADMIN" && session.user.userLevel !== "SUPER_ADMIN")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端菜单按钮 */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* 侧边栏 */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold text-gray-900">管理后台</h1>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 用户信息 */}
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {session.user.name?.[0] || session.user.username?.[0] || "A"}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {session.user.name || session.user.username}
                </p>
                <p className="text-xs text-gray-500">{session.user.userLevel}</p>
              </div>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 p-4 space-y-2">
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          {/* 底部操作 */}
          <div className="p-4 border-t space-y-2">
            <Link
              href="/"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full"
            >
              <Home className="h-5 w-5" />
              <span>返回首页</span>
            </Link>
            <Button
              variant="ghost"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full justify-start"
              onClick={() => {
                // 这里可以添加登出逻辑
                router.push("/auth/signin");
              }}
            >
              <LogOut className="h-5 w-5" />
              <span>退出登录</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="lg:ml-64">
        {/* 移动端遮罩 */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 内容 */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
