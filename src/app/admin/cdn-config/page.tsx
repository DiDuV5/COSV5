/**
 * @fileoverview CDN配置管理页面
 * @description 提供CDN配置的可视化管理界面，支持动态配置和安全设置
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Shield,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  RotateCcw
} from 'lucide-react';
import { cdnConfig, type CDNConfig, type CDNSecurityConfig } from '@/lib/media/cdn-config-manager';
import { cdnSecurity } from '@/lib/media/cdn-security-middleware';

export default function CDNConfigPage() {
  const [config, setConfig] = useState<CDNConfig | null>(null);
  const [_securityConfig, setSecurityConfig] = useState<CDNSecurityConfig | null>(null);
  const [accessStats, setAccessStats] = useState<any>(null);
  const [isPending, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    primaryDomain: '',
    backupDomains: '',
    whitelistDomains: '',
    allowedOrigins: '',
    enableHotlinkProtection: true,
    rateLimitPerMinute: 100,
    maxFileSizeMB: 100,
    enableAccessLog: true,
    enableAnomalyDetection: true,
  });

  useEffect(() => {
    loadConfig();
    loadAccessStats();

    // 每30秒刷新统计数据
    const interval = setInterval(loadAccessStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadConfig = () => {
    try {
      const currentConfig = cdnConfig.getConfig();
      const currentSecurityConfig = cdnConfig.getSecurityConfig();

      setConfig(currentConfig);
      setSecurityConfig(currentSecurityConfig);

      // 更新表单数据
      setFormData({
        primaryDomain: currentConfig.primaryDomain,
        backupDomains: currentConfig.backupDomains.join(', '),
        whitelistDomains: currentConfig.whitelistDomains.join(', '),
        allowedOrigins: currentConfig.allowedOrigins.join(', '),
        enableHotlinkProtection: currentConfig.enableHotlinkProtection,
        rateLimitPerMinute: currentConfig.rateLimitPerMinute,
        maxFileSizeMB: currentConfig.maxFileSizeMB,
        enableAccessLog: currentConfig.enableAccessLog,
        enableAnomalyDetection: currentConfig.enableAnomalyDetection,
      });

      setIsLoading(false);
    } catch (error) {
      console.error('加载配置失败:', error);
      setMessage({ type: 'error', text: '加载配置失败' });
      setIsLoading(false);
    }
  };

  const loadAccessStats = () => {
    try {
      const stats = cdnSecurity.getAccessStats();
      setAccessStats(stats);
    } catch (error) {
      console.error('加载访问统计失败:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const newConfig: Partial<CDNConfig> = {
        primaryDomain: formData.primaryDomain,
        backupDomains: formData.backupDomains.split(',').map(d => d.trim()).filter(d => d),
        whitelistDomains: formData.whitelistDomains.split(',').map(d => d.trim()).filter(d => d),
        allowedOrigins: formData.allowedOrigins.split(',').map(d => d.trim()).filter(d => d),
        enableHotlinkProtection: formData.enableHotlinkProtection,
        rateLimitPerMinute: formData.rateLimitPerMinute,
        maxFileSizeMB: formData.maxFileSizeMB,
        enableAccessLog: formData.enableAccessLog,
        enableAnomalyDetection: formData.enableAnomalyDetection,
      };

      const success = cdnConfig.updateConfig(newConfig);

      if (success) {
        setMessage({ type: 'success', text: '配置已成功更新' });
        loadConfig();
      } else {
        setMessage({ type: 'error', text: '配置更新失败，请检查输入格式' });
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      setMessage({ type: 'error', text: '保存配置失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData({
        primaryDomain: config.primaryDomain,
        backupDomains: config.backupDomains.join(', '),
        whitelistDomains: config.whitelistDomains.join(', '),
        allowedOrigins: config.allowedOrigins.join(', '),
        enableHotlinkProtection: config.enableHotlinkProtection,
        rateLimitPerMinute: config.rateLimitPerMinute,
        maxFileSizeMB: config.maxFileSizeMB,
        enableAccessLog: config.enableAccessLog,
        enableAnomalyDetection: config.enableAnomalyDetection,
      });
      setMessage(null);
    }
  };

  const handleReloadConfig = () => {
    cdnConfig.reloadConfig();
    loadConfig();
    setMessage({ type: 'success', text: '配置已从环境变量重新加载' });
  };

  if (isPending) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">加载配置中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CDN配置管理</h1>
          <p className="text-muted-foreground mt-2">
            管理CDN域名配置、安全设置和访问控制
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReloadConfig}>
            <RefreshCw className="h-4 w-4 mr-2" />
            重新加载
          </Button>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            基础配置
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            安全设置
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            访问统计
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CDN域名配置</CardTitle>
              <CardDescription>
                配置主CDN域名和备用域名，支持环境变量动态切换
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryDomain">主CDN域名</Label>
                  <Input
                    id="primaryDomain"
                    value={formData.primaryDomain}
                    onChange={(e) => setFormData({ ...formData, primaryDomain: e.target.value })}
                    placeholder="https://cdn.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="environment">当前环境</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={config?.environment === 'production' ? 'destructive' : 'secondary'}>
                      {config?.environment}
                    </Badge>
                    {config?.environment === 'development' && (
                      <span className="text-sm text-muted-foreground">开发环境</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backupDomains">备用CDN域名</Label>
                <Input
                  id="backupDomains"
                  value={formData.backupDomains}
                  onChange={(e) => setFormData({ ...formData, backupDomains: e.target.value })}
                  placeholder="https://backup1.com, https://backup2.com"
                />
                <p className="text-sm text-muted-foreground">
                  多个域名用逗号分隔
                </p>
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  重置
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? '保存中...' : '保存配置'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>安全配置</CardTitle>
              <CardDescription>
                配置访问控制、防盗链保护和异常检测
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whitelistDomains">白名单域名</Label>
                  <Input
                    id="whitelistDomains"
                    value={formData.whitelistDomains}
                    onChange={(e) => setFormData({ ...formData, whitelistDomains: e.target.value })}
                    placeholder="example.com, *.example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowedOrigins">允许的来源</Label>
                  <Input
                    id="allowedOrigins"
                    value={formData.allowedOrigins}
                    onChange={(e) => setFormData({ ...formData, allowedOrigins: e.target.value })}
                    placeholder="https://example.com, https://app.example.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rateLimitPerMinute">每分钟请求限制</Label>
                    <Input
                      id="rateLimitPerMinute"
                      type="number"
                      value={formData.rateLimitPerMinute}
                      onChange={(e) => setFormData({ ...formData, rateLimitPerMinute: parseInt(e.target.value) })}
                      min="1"
                      max="1000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxFileSizeMB">最大文件大小 (MB)</Label>
                    <Input
                      id="maxFileSizeMB"
                      type="number"
                      value={formData.maxFileSizeMB}
                      onChange={(e) => setFormData({ ...formData, maxFileSizeMB: parseInt(e.target.value) })}
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>防盗链保护</Label>
                      <p className="text-sm text-muted-foreground">
                        验证请求来源，防止未授权访问
                      </p>
                    </div>
                    <Switch
                      checked={formData.enableHotlinkProtection}
                      onCheckedChange={(checked) => setFormData({ ...formData, enableHotlinkProtection: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>访问日志</Label>
                      <p className="text-sm text-muted-foreground">
                        记录所有访问请求
                      </p>
                    </div>
                    <Switch
                      checked={formData.enableAccessLog}
                      onCheckedChange={(checked) => setFormData({ ...formData, enableAccessLog: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>异常检测</Label>
                      <p className="text-sm text-muted-foreground">
                        自动检测和阻止可疑行为
                      </p>
                    </div>
                    <Switch
                      checked={formData.enableAnomalyDetection}
                      onCheckedChange={(checked) => setFormData({ ...formData, enableAnomalyDetection: checked })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  重置
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? '保存中...' : '保存配置'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">总请求数</p>
                    <p className="text-2xl font-bold">{accessStats?.totalRequests || 0}</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">允许请求</p>
                    <p className="text-2xl font-bold text-green-600">{accessStats?.allowedRequests || 0}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">阻止请求</p>
                    <p className="text-2xl font-bold text-red-600">{accessStats?.blockedRequests || 0}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">限流请求</p>
                    <p className="text-2xl font-bold text-yellow-600">{accessStats?.rateLimitedRequests || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {accessStats?.topIPs && accessStats.topIPs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>访问频率最高的IP</CardTitle>
                <CardDescription>
                  过去1小时内访问次数最多的IP地址
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {accessStats.topIPs.slice(0, 10).map((item: any, index: number) => (
                    <div key={item.ip} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-mono">{item.ip}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.count} 次请求</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
