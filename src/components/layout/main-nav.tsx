/**
 * @fileoverview 主导航组件
 * @description 全站统一的主导航栏组件，包含搜索、用户菜单等功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - next-auth: ^4.24.0
 * - lucide-react: ^0.263.1
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  User,
  Settings,
  LogOut,
  Plus,
  ChevronDown,
  Home,
  Compass,
  TrendingUp,
  MessageCircle,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UnifiedAvatar } from "@/components/ui/unified-avatar";

interface MainNavProps {
  className?: string;
}

// 桌面端专用导航项 - 避免与底部导航重叠
const desktopNavItems = [
  {
    title: "热门",
    href: "/trending",
    icon: TrendingUp,
  },
  {
    title: "作品",
    href: "/posts",
    icon: MessageCircle,
  },
];

export function MainNav({ className }: MainNavProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  // 处理登出
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  // 检查当前路径是否激活
  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* 左侧空白区域 - 保持布局平衡 */}
          <div className="flex items-center">
            {/* 移除了logo和标题，保留空白区域用于布局平衡 */}
          </div>

          {/* 桌面端导航 - 专注于顶部特有功能 */}
          <nav className="hidden md:flex items-center space-x-6">
            {desktopNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          {/* 搜索框 */}
          <div className="flex-1 max-w-sm mx-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="搜索内容、用户、标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4"
              />
            </form>
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center space-x-4">
            {/* 移动端菜单按钮 */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            {status === "loading" ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : session ? (
              <>
                {/* 发布按钮 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="hidden sm:flex">
                      <Plus className="h-4 w-4 mr-1" />
                      发布
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/create">
                        <Plus className="h-4 w-4 mr-2" />
                        发布作品
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/moments/create">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        发布动态
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 通知按钮 */}
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <Bell className="h-4 w-4" />
                </Button>

                {/* 用户菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                      <UnifiedAvatar
                        user={{
                          username: session.user?.username || session.user?.email || 'user',
                          displayName: (session.user as any)?.displayName || session.user?.name,
                          avatarUrl: (session.user as any)?.avatarUrl || session.user?.image,
                          isVerified: (session.user as any)?.isVerified || false,
                        }}
                        size="sm"
                        showVerifiedBadge={false}
                        fallbackType="gradient"
                      />
                      <ChevronDown className="h-4 w-4 hidden sm:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      {session.user?.name || session.user?.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="h-4 w-4 mr-2" />
                        个人主页
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        设置
                      </Link>
                    </DropdownMenuItem>
                    {(session.user as any)?.userLevel === "ADMIN" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <Settings className="h-4 w-4 mr-2" />
                            管理后台
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">
                    登录
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">注册</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* 移动端导航菜单 - 简化版，主要功能由底部导航承担 */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="flex flex-col space-y-1 p-4">
              {/* 移动端只显示顶部特有功能 */}
              {desktopNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              ))}

              {session && (
                <>
                  <div className="border-t pt-2 mt-2">
                    <Link
                      href="/create"
                      className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Plus className="h-4 w-4" />
                      <span>发布作品</span>
                    </Link>
                    <Link
                      href="/moments/create"
                      className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>发布动态</span>
                    </Link>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
