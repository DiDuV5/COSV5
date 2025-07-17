/**
 * @fileoverview 对象存储管理页面
 * @description 管理和监控对象存储服务的管理界面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC客户端
 * - shadcn/ui组件
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Trash2, 
  Download, 
  Upload,
  Settings,
  BarChart3,
  FileText,
  HardDrive,
  Cloud,
  Zap
} from 'lucide-react';
import { api } from '@/trpc/react';
import { toast } from 'sonner';

export default function ObjectStoragePage() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [testKey, setTestKey] = useState('');

  // API查询
  const { data: config, refetch: refetchConfig } = api.objectStorage.getConfig.useQuery();
  const { data: stats, refetch: refetchStats } = api.objectStorage.getStats.useQuery();
  const { data: files, refetch: refetchFiles } = api.objectStorage.listFiles.useQuery({
    maxKeys: 50,
  });

  // API变更
  const testConnection = api.objectStorage.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('连接测试成功');
      } else {
        toast.error(`连接测试失败: ${data.message}`);
      }
    },
    onError: (error) => {
      toast.error(`连接测试失败: ${error.message}`);
    },
  });

  const clearCache = api.objectStorage.clearCache.useMutation({
    onSuccess: () => {
      toast.success('缓存清除成功');
      refetchStats();
    },
    onError: (error) => {
      toast.error(`清除缓存失败: ${error.message}`);
    },
  });

  const deleteFile = api.objectStorage.deleteFile.useMutation({
    onSuccess: () => {
      toast.success('文件删除成功');
      refetchFiles();
    },
    onError: (error) => {
      toast.error(`删除文件失败: ${error.message}`);
    },
  });

  const generatePresignedUrl = api.objectStorage.generatePresignedUrl.useMutation({
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.url);
      toast.success('预签名URL已复制到剪贴板');
    },
    onError: (error) => {
      toast.error(`生成预签名URL失败: ${error.message}`);
    },
  });

  const handleTestConnection = () => {
    testConnection.mutate();
  };

  const handleClearCache = () => {
    clearCache.mutate();
  };

  const handleDeleteFile = (key: string) => {
    if (confirm(`确定要删除文件 ${key} 吗？`)) {
      deleteFile.mutate({ key });
    }
  };

  const handleGenerateUrl = (key: string, operation: 'get' | 'put') => {
    generatePresignedUrl.mutate({ key, operation });
  };

  const getStatusBadge = (isHealthy?: boolean) => {
    if (isHealthy === undefined) return <Badge variant="secondary">未知</Badge>;
    return isHealthy ? (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        健康
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertCircle className="w-3 h-3 mr-1" />
        异常
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">对象存储管理</h1>
          <p className="text-muted-foreground">管理和监控CoserEden对象存储服务</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleTestConnection}
            disabled={testConnection.isPending}
            variant="outline"
          >
            {testConnection.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            测试连接
          </Button>
          <Button
            onClick={handleClearCache}
            disabled={clearCache.isPending}
            variant="outline"
          >
            {clearCache.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            清除缓存
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="files">文件管理</TabsTrigger>
          <TabsTrigger value="config">配置信息</TabsTrigger>
          <TabsTrigger value="tools">工具</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* 配置状态 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                配置状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              {config ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span>配置有效性:</span>
                    {config.isValid ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        有效
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        无效
                      </Badge>
                    )}
                  </div>

                  {config.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>配置错误</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {config.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {config.warnings.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>配置警告</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {config.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {config.summary.primary?.provider || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">主要存储</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {config.summary.fallback?.provider || '无'}
                      </div>
                      <div className="text-sm text-muted-foreground">备用存储</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {config.summary.enableFailover ? '启用' : '禁用'}
                      </div>
                      <div className="text-sm text-muted-foreground">故障转移</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {config.summary.enableCache ? '启用' : '禁用'}
                      </div>
                      <div className="text-sm text-muted-foreground">缓存</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>加载配置信息...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 存储统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                存储统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <HardDrive className="w-5 h-5 text-blue-500" />
                      <span className="font-semibold">主要存储</span>
                    </div>
                    {getStatusBadge(stats.primary?.isHealthy)}
                    {stats.primary?.lastCheck && (
                      <div className="text-xs text-muted-foreground mt-1">
                        最后检查: {new Date(stats.primary.lastCheck).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Cloud className="w-5 h-5 text-purple-500" />
                      <span className="font-semibold">备用存储</span>
                    </div>
                    {stats.fallback ? (
                      <>
                        {getStatusBadge(stats.fallback.isHealthy)}
                        {stats.fallback.lastCheck && (
                          <div className="text-xs text-muted-foreground mt-1">
                            最后检查: {new Date(stats.fallback.lastCheck).toLocaleString()}
                          </div>
                        )}
                      </>
                    ) : (
                      <Badge variant="secondary">未配置</Badge>
                    )}
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-green-500" />
                      <span className="font-semibold">缓存</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.cacheSize}
                    </div>
                    <div className="text-xs text-muted-foreground">缓存项数量</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>加载统计信息...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                文件列表
              </CardTitle>
              <CardDescription>
                管理存储在对象存储中的文件
              </CardDescription>
            </CardHeader>
            <CardContent>
              {files ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    共找到 {files.files.length} 个文件
                  </div>
                  
                  <div className="space-y-2">
                    {files.files.map((file) => (
                      <div
                        key={file.key}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{file.key}</div>
                          <div className="text-sm text-muted-foreground">
                            大小: {(file.size / 1024).toFixed(2)} KB | 
                            修改时间: {new Date(file.lastModified).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateUrl(file.key, 'get')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteFile(file.key)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {files.files.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无文件
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p>加载文件列表...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>详细配置信息</CardTitle>
            </CardHeader>
            <CardContent>
              {config && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">配置摘要</h3>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                      {JSON.stringify(config.summary, null, 2)}
                    </pre>
                  </div>
                  
                  {config.errors.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-red-600">错误信息</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {config.errors.map((error, index) => (
                          <li key={index} className="text-red-600">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {config.warnings.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-yellow-600">警告信息</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {config.warnings.map((warning, index) => (
                          <li key={index} className="text-yellow-600">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>存储工具</CardTitle>
              <CardDescription>
                用于测试和管理对象存储的工具
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test-key">生成预签名URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="test-key"
                    placeholder="输入文件键名，如: images/test.jpg"
                    value={testKey}
                    onChange={(e) => setTestKey(e.target.value)}
                  />
                  <Button
                    onClick={() => handleGenerateUrl(testKey, 'get')}
                    disabled={!testKey}
                  >
                    下载URL
                  </Button>
                  <Button
                    onClick={() => handleGenerateUrl(testKey, 'put')}
                    disabled={!testKey}
                    variant="outline"
                  >
                    上传URL
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
