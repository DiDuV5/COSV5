/**
 * @fileoverview 邮箱配置部分组件
 * @author Augment AI
 * @date 2025-07-03
 */
"use client";


import React from "react";
import { Settings, TestTube, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailConfig } from "../types/email-management";

interface EmailConfigSectionProps {
  emailConfig: EmailConfig;
  setEmailConfig: React.Dispatch<React.SetStateAction<EmailConfig>>;
  testEmail: string;
  setTestEmail: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  configLoading: boolean;
  onUpdateConfig: () => Promise<void>;
  onTestConnection: () => Promise<void>;
  onRefreshConfig: () => void;
}

export function EmailConfigSection({
  emailConfig,
  setEmailConfig,
  testEmail,
  setTestEmail,
  isLoading,
  configLoading,
  onUpdateConfig,
  onTestConnection,
  onRefreshConfig,
}: EmailConfigSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            SMTP 配置
          </CardTitle>
          <CardDescription>
            配置邮件服务器设置，用于发送系统邮件
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtpHost">SMTP 主机</Label>
              <Input
                id="smtpHost"
                value={emailConfig.smtpHost}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpHost: e.target.value }))}
                placeholder="smtp.example.com"
              />
            </div>

            <div>
              <Label htmlFor="smtpPort">SMTP 端口</Label>
              <Input
                id="smtpPort"
                type="number"
                value={emailConfig.smtpPort}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                placeholder="587"
              />
            </div>

            <div>
              <Label htmlFor="smtpUser">SMTP 用户名</Label>
              <Input
                id="smtpUser"
                type="email"
                value={emailConfig.smtpUser}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpUser: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <Label htmlFor="smtpPassword">SMTP 密码</Label>
              <Input
                id="smtpPassword"
                type="password"
                value={emailConfig.smtpPassword}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpPassword: e.target.value }))}
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label htmlFor="smtpFromName">发件人名称</Label>
              <Input
                id="smtpFromName"
                value={emailConfig.smtpFromName}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpFromName: e.target.value }))}
                placeholder="CoserEden"
              />
            </div>

            <div>
              <Label htmlFor="smtpFromEmail">发件人邮箱</Label>
              <Input
                id="smtpFromEmail"
                type="email"
                value={emailConfig.smtpFromEmail}
                onChange={(e) => setEmailConfig(prev => ({ ...prev, smtpFromEmail: e.target.value }))}
                placeholder="noreply@cosereeden.com"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={onUpdateConfig}
              disabled={isLoading || configLoading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "保存中..." : "保存配置"}
            </Button>
            <Button
              variant="outline"
              onClick={onRefreshConfig}
              disabled={configLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              刷新配置
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            连接测试
          </CardTitle>
          <CardDescription>
            测试邮件服务器连接和发送功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="testEmail">测试邮箱地址</Label>
            <Input
              id="testEmail"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>

          <Button
            onClick={onTestConnection}
            disabled={isLoading || !testEmail}
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {isLoading ? "测试中..." : "发送测试邮件"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
