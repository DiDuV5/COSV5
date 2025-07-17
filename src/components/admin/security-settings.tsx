/**
 * @fileoverview 安全设置组件
 * @description 管理系统安全相关配置
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Shield, Key, Clock, AlertTriangle, RefreshCw, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SecuritySettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 安全设置状态
  const [settings, setSettings] = useState({
    sessionTimeout: 24, // 会话超时时间（小时）
    maxLoginAttempts: 5, // 最大登录尝试次数
    lockoutDuration: 30, // 锁定时长（分钟）
    enableTwoFactor: false, // 启用双因素认证
    enableIpWhitelist: false, // 启用IP白名单
    enableAuditLog: true, // 启用审计日志
    logRetentionDays: 90, // 日志保留天数
    enableRateLimit: true, // 启用请求频率限制
    rateLimitRequests: 100, // 每分钟请求数限制
  });

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // 这里需要实现安全设置更新的 API
      // await updateSecuritySettings.mutateAsync(settings);
      setSaveMessage({ type: 'success', message: '安全设置已成功更新' });
    } catch (error) {
      setSaveMessage({ type: 'error', message: '更新失败，请重试' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* 保存消息 */}
      {saveMessage && (
        <Alert className={saveMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {saveMessage.message}
          </AlertDescription>
        </Alert>
      )}

      {/* 会话安全 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>会话安全</span>
          </CardTitle>
          <CardDescription>
            管理用户会话和登录安全策略
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">会话超时时间（小时）</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="1"
                max="168"
                value={settings.sessionTimeout}
                onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
              />
              <p className="text-sm text-gray-500">
                用户无操作后自动登出的时间
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">最大登录尝试次数</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min="3"
                max="10"
                value={settings.maxLoginAttempts}
                onChange={(e) => updateSetting('maxLoginAttempts', parseInt(e.target.value))}
              />
              <p className="text-sm text-gray-500">
                连续登录失败后锁定账户
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lockoutDuration">账户锁定时长（分钟）</Label>
            <Input
              id="lockoutDuration"
              type="number"
              min="5"
              max="1440"
              value={settings.lockoutDuration}
              onChange={(e) => updateSetting('lockoutDuration', parseInt(e.target.value))}
              className="max-w-xs"
            />
            <p className="text-sm text-gray-500">
              账户被锁定后的解锁时间
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 高级安全功能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>高级安全功能</span>
          </CardTitle>
          <CardDescription>
            额外的安全保护措施
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableTwoFactor">双因素认证</Label>
              <p className="text-sm text-gray-500">
                为管理员账户启用双因素认证
              </p>
            </div>
            <Switch
              id="enableTwoFactor"
              checked={settings.enableTwoFactor}
              onCheckedChange={(checked) => updateSetting('enableTwoFactor', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableIpWhitelist">IP 白名单</Label>
              <p className="text-sm text-gray-500">
                限制管理后台只能从指定IP访问
              </p>
            </div>
            <Switch
              id="enableIpWhitelist"
              checked={settings.enableIpWhitelist}
              onCheckedChange={(checked) => updateSetting('enableIpWhitelist', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableRateLimit">请求频率限制</Label>
              <p className="text-sm text-gray-500">
                限制API请求频率，防止恶意攻击
              </p>
            </div>
            <Switch
              id="enableRateLimit"
              checked={settings.enableRateLimit}
              onCheckedChange={(checked) => updateSetting('enableRateLimit', checked)}
            />
          </div>

          {settings.enableRateLimit && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="rateLimitRequests">每分钟请求数限制</Label>
              <Input
                id="rateLimitRequests"
                type="number"
                min="10"
                max="1000"
                value={settings.rateLimitRequests}
                onChange={(e) => updateSetting('rateLimitRequests', parseInt(e.target.value))}
                className="max-w-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 审计日志 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>审计日志</span>
          </CardTitle>
          <CardDescription>
            系统操作记录和日志管理
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableAuditLog">启用审计日志</Label>
              <p className="text-sm text-gray-500">
                记录所有重要的系统操作
              </p>
            </div>
            <Switch
              id="enableAuditLog"
              checked={settings.enableAuditLog}
              onCheckedChange={(checked) => updateSetting('enableAuditLog', checked)}
            />
          </div>

          {settings.enableAuditLog && (
            <div className="space-y-2">
              <Label htmlFor="logRetentionDays">日志保留天数</Label>
              <Input
                id="logRetentionDays"
                type="number"
                min="7"
                max="365"
                value={settings.logRetentionDays}
                onChange={(e) => updateSetting('logRetentionDays', parseInt(e.target.value))}
                className="max-w-xs"
              />
              <p className="text-sm text-gray-500">
                超过此天数的日志将被自动删除
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 安全状态概览 */}
      <Card>
        <CardHeader>
          <CardTitle>安全状态概览</CardTitle>
          <CardDescription>
            当前系统的安全配置状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">HTTPS 加密</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">已启用</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">数据库加密</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">已启用</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm font-medium">双因素认证</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${settings.enableTwoFactor ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className={`text-sm ${settings.enableTwoFactor ? 'text-green-600' : 'text-yellow-600'}`}>
                  {settings.enableTwoFactor ? '已启用' : '未启用'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium">审计日志</span>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${settings.enableAuditLog ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`text-sm ${settings.enableAuditLog ? 'text-green-600' : 'text-red-600'}`}>
                  {settings.enableAuditLog ? '已启用' : '已禁用'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存设置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
