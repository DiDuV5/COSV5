/**
 * @fileoverview 待审核用户提示页面
 * @description 为待审核用户显示友好的等待审核提示界面
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - NextAuth.js
 * - shadcn/ui
 *
 * @changelog
 * - 2025-06-22: 初始版本创建，待审核用户提示页面
 */

"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  RefreshCw,
  LogOut,
  AlertCircle,
  Info,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";

interface PendingApprovalPageProps {
  userApprovalStatus?: string;
  userEmail?: string;
  userName?: string;
}

export function PendingApprovalPage({ 
  userApprovalStatus = "PENDING",
  userEmail,
  userName 
}: PendingApprovalPageProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 获取审核配置以显示相关信息
  const { data: config } = api.userApproval.getApprovalConfig.useQuery();

  // 检查用户审核状态
  const checkApprovalStatus = async () => {
    setIsRefreshing(true);
    try {
      // 更新session以获取最新的用户状态
      await update();
      
      // 如果状态已变更，刷新页面
      if (session?.user?.approvalStatus === "APPROVED") {
        toast.success("您的账号已通过审核！");
        router.push("/");
      } else if (session?.user?.approvalStatus === "REJECTED") {
        toast.error("很抱歉，您的账号审核未通过");
      }
    } catch (error) {
      toast.error("检查审核状态失败，请稍后重试");
    } finally {
      setIsRefreshing(false);
    }
  };

  // 处理退出登录
  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      toast.error("退出登录失败");
    }
  };

  // 根据审核状态返回不同的内容
  const getStatusContent = () => {
    switch (userApprovalStatus) {
      case "PENDING":
        return {
          icon: <Clock className="w-12 h-12 text-orange-500" />,
          title: "账号等待审核中",
          description: "您的注册申请已提交，正在等待管理员审核",
          badgeVariant: "secondary" as const,
          badgeText: "待审核",
          color: "orange",
        };
      case "REJECTED":
        return {
          icon: <XCircle className="w-12 h-12 text-red-500" />,
          title: "账号审核未通过",
          description: "很抱歉，您的注册申请未通过审核",
          badgeVariant: "destructive" as const,
          badgeText: "已拒绝",
          color: "red",
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-gray-500" />,
          title: "账号状态异常",
          description: "您的账号状态异常，请联系管理员",
          badgeVariant: "secondary" as const,
          badgeText: "异常",
          color: "gray",
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* 主要状态卡片 */}
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              {statusContent.icon}
            </div>
            <CardTitle className="text-xl">{statusContent.title}</CardTitle>
            <CardDescription className="text-base">
              {statusContent.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 用户信息 */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-gray-600">当前状态:</span>
                <Badge variant={statusContent.badgeVariant}>
                  {statusContent.badgeText}
                </Badge>
              </div>
              
              {userName && (
                <div className="text-sm text-gray-600">
                  用户名: <span className="font-medium">{userName}</span>
                </div>
              )}
              
              {userEmail && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{userEmail}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* 根据状态显示不同的操作和信息 */}
            {userApprovalStatus === "PENDING" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">审核说明</p>
                      <ul className="space-y-1 text-xs">
                        <li>• 管理员会在1-3个工作日内完成审核</li>
                        <li>• 审核结果将通过邮件通知您</li>
                        <li>• 您可以随时点击&ldquo;检查状态&rdquo;查看最新进展</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={checkApprovalStatus}
                    disabled={isRefreshing}
                    className="flex-1"
                    variant="outline"
                  >
                    {isRefreshing ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    检查状态
                  </Button>
                </div>
              </div>
            )}

            {userApprovalStatus === "REJECTED" && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-red-800">
                      <p className="font-medium mb-1">审核未通过</p>
                      <p className="text-xs">
                        如有疑问，请联系管理员了解具体原因
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 通用操作 */}
            <div className="space-y-3">
              <Separator />
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 联系信息卡片 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">需要帮助？</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">
              <p>如果您有任何疑问或需要帮助，请联系运营：</p>
            </div>
            <div className="space-y-3 text-sm">
              <a
                href="https://t.me/CoserYYbot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
              >
                <MessageCircle className="w-4 h-4 text-blue-600" />
                <span className="text-blue-700 group-hover:text-blue-800 font-medium">
                  Telegram: @CoserYYbot
                </span>
              </a>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">邮箱: tu@tutu365.cc</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 系统信息 */}
        {config && (
          <div className="text-center text-xs text-gray-500">
            <p>CoserEden - 专业cosplay创作者社区</p>
            {config.registrationApprovalEnabled && (
              <p className="mt-1">当前启用了注册审核功能</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PendingApprovalPage;
