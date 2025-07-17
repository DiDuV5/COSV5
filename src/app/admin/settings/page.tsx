/**
 * @fileoverview 系统设置页面
 * @description 管理系统的各种设置，包括认证、邮箱等配置
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/react-query: ^10.45.0
 * - react-hook-form: ^7.48.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Shield, Mail, MessageCircle, Upload, UserCheck, ShieldCheck } from "lucide-react";

// 导入各个设置组件
import { AuthSettings } from "@/components/admin/auth-settings";
import { SecuritySettings } from "@/components/admin/security-settings";
import { UploadSettings } from "@/components/admin/upload-settings";
import { ApprovalSettings } from "@/components/admin/approval-settings";
import { TurnstileSettings } from "@/components/admin/turnstile-settings";

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState("auth");

  const settingsTabs = [
    {
      id: "auth",
      label: "认证设置",
      icon: Shield,
      description: "管理用户注册登录方式和密码策略",
      component: AuthSettings,
    },
    {
      id: "approval",
      label: "用户审核",
      icon: UserCheck,
      description: "配置用户注册审核功能和通知设置",
      component: ApprovalSettings,
    },
    {
      id: "turnstile",
      label: "人机验证",
      icon: ShieldCheck,
      description: "管理Turnstile人机验证功能和安全设置",
      component: TurnstileSettings,
    },
    {
      id: "upload",
      label: "文件上传",
      icon: Upload,
      description: "配置文件上传限制、存储和去重设置",
      component: UploadSettings,
    },
    {
      id: "security",
      label: "安全设置",
      icon: Settings,
      description: "系统安全相关配置",
      component: SecuritySettings,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">系统设置</h1>
        <p className="text-gray-600 mt-2">配置和管理系统的各项功能设置</p>
      </div>

      {/* 设置选项卡 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {settingsTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center space-x-2"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {settingsTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <tab.component />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
