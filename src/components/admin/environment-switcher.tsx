/**
 * @fileoverview 环境切换组件
 * @description CDN环境切换和配置管理组件
 * @author Augment AI
 * @date 2025-06-16
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Server,
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  Globe,
  Zap
} from 'lucide-react';
import { api } from '@/trpc/react';

interface EnvironmentConfig {
  currentEnvironment: string;
  activeDomain: string;
  sslStatus: 'valid' | 'invalid' | 'pending' | 'unknown';
  configuration: {
    domains: Array<{
      url: string;
      name: string;
      environment: string[];
      requiresSSL: boolean;
      priority: number;
    }>;
    sslConfig: {
      enabled: boolean;
      enforceHTTPS: boolean;
      certificateStatus: string;
    };
  };
  environmentDomains: {
    development: any[];
    staging: any[];
    production: any[];
  };
}

export default function EnvironmentSwitcher() {
  const [config, setConfig] = useState<EnvironmentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // 加载环境配置
  useEffect(() => {
    loadEnvironmentConfig();
  }, []);

  const loadEnvironmentConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/cdn-config/environment');

      if (response.ok) {
        const data = await response.json();
        setConfig(data.data);
      } else {
        throw new Error('加载环境配置失败');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '加载环境配置失败' });
    } finally {
      setLoading(false);
    }
  };

  const switchEnvironment = async (newEnvironment: string) => {
    try {
      setSwitching(true);
      setMessage(null);

      const response = await fetch('/api/admin/cdn-config/environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: newEnvironment }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: `环境已切换到 ${newEnvironment}，活跃域名: ${data.data.activeDomain}`
        });
        await loadEnvironmentConfig();
      } else {
        throw new Error('环境切换失败');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '环境切换失败' });
    } finally {
      setSwitching(false);
    }
  };

  const performHealthCheck = async () => {
    try {
      setTesting(true);
      setMessage(null);

      const response = await fetch('/api/admin/cdn-config/environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performHealthCheck: true }),
      });

      if (response.ok) {
        const data = await response.json();
        const healthResults = data.data.healthCheck;
        const healthyCount = healthResults.filter((r: any) => r.healthy).length;

        setMessage({
          type: healthyCount === healthResults.length ? 'success' : 'warning',
          text: `健康检查完成: ${healthyCount}/${healthResults.length} 个域名健康`
        });
        await loadEnvironmentConfig();
      } else {
        throw new Error('健康检查失败');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '健康检查失败' });
    } finally {
      setTesting(false);
    }
  };

  const testFailover = async () => {
    try {
      setTesting(true);
      setMessage(null);

      const response = await fetch('/api/admin/cdn-config/environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testFailover: true }),
      });

      if (response.ok) {
        const data = await response.json();
        const failoverResult = data.data.failoverTest;

        if (failoverResult.success) {
          setMessage({
            type: 'success',
            text: `故障切换测试成功，备用域名: ${failoverResult.fallbackDomain}`
          });
        } else {
          setMessage({
            type: 'warning',
            text: '故障切换测试失败，没有可用的备用域名'
          });
        }
      } else {
        throw new Error('故障切换测试失败');
      }
    } catch (error) {
      setMessage({ type: 'error', text: '故障切换测试失败' });
    } finally {
      setTesting(false);
    }
  };

  const getEnvironmentBadgeVariant = (env: string) => {
    switch (env) {
      case 'production': return 'destructive';
      case 'staging': return 'secondary';
      case 'development': return 'outline';
      default: return 'outline';
    }
  };

  const getSSLStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>加载环境配置中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              无法加载环境配置，请检查系统设置。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert className={
          message.type === 'error' ? 'border-red-200 bg-red-50' : 
          message.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
          'border-green-200 bg-green-50'
        }>
          <AlertDescription className={
            message.type === 'error' ? 'text-red-800' : 
            message.type === 'warning' ? 'text-yellow-800' :
            'text-green-800'
          }>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            环境切换控制
          </CardTitle>
          <CardDescription>
            管理CDN环境配置和域名切换
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 当前环境状态 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">当前环境</label>
              <div className="flex items-center gap-2">
                <Badge variant={getEnvironmentBadgeVariant(config.currentEnvironment)}>
                  {config.currentEnvironment}
                </Badge>
                {config.currentEnvironment === 'production' && (
                  <span className="text-sm text-red-600">生产环境</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">活跃域名</label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-mono truncate">{config.activeDomain}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">SSL状态</label>
              <div className="flex items-center gap-2">
                {getSSLStatusIcon(config.sslStatus)}
                <span className="text-sm capitalize">{config.sslStatus}</span>
              </div>
            </div>
          </div>

          {/* 环境切换 */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">切换到环境</label>
                <Select onValueChange={switchEnvironment}>
                  <SelectTrigger disabled={switching}>
                    <SelectValue placeholder="选择目标环境" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">开发环境 (Development)</SelectItem>
                    <SelectItem value="staging">测试环境 (Staging)</SelectItem>
                    <SelectItem value="production">生产环境 (Production)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 pt-6">
                <Button 
                  variant="outline" 
                  onClick={performHealthCheck}
                  disabled={testing}
                >
                  {testing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  健康检查
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={testFailover}
                  disabled={testing}
                >
                  {testing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  故障切换测试
                </Button>
              </div>
            </div>
          </div>

          {/* 域名配置概览 */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">可用域名配置</h4>
            <div className="grid grid-cols-1 gap-3">
              {config.configuration.domains.map((domain, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {domain.url === config.activeDomain ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-4 h-4 border rounded-full" />
                      )}
                      <span className="font-medium">{domain.name}</span>
                    </div>
                    <div className="flex gap-1">
                      {domain.environment.map(env => (
                        <Badge key={env} variant="outline" className="text-xs">
                          {env}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {domain.requiresSSL && (
                      <Shield className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="text-sm text-gray-500">优先级: {domain.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
