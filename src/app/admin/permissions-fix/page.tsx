/**
 * @fileoverview 权限修复管理页面
 * @description 管理员权限同步和修复工具页面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - tRPC
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建，权限修复管理页面
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/trpc/react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Users, Settings } from 'lucide-react';

export default function PermissionsFixPage() {
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);

  // 获取权限概览
  const { data: overview, refetch: refetchOverview } = api.adminPermissions.getPermissionOverview.useQuery();

  // 检查权限完整性
  const { data: integrityCheck, refetch: refetchIntegrity } = api.adminPermissions.checkIntegrity.useQuery();

  // 修复所有权限
  const fixAllPermissions = api.adminPermissions.fixAllPermissions.useMutation({
    onSuccess: (result) => {
      setFixResult(result);
      setIsFixing(false);
      refetchOverview();
      refetchIntegrity();
    },
    onError: (error) => {
      console.error('权限修复失败:', error);
      setIsFixing(false);
    },
  });

  // 同步权限
  const syncPermissions = api.adminPermissions.syncPermissions.useMutation({
    onSuccess: () => {
      refetchOverview();
      refetchIntegrity();
    },
  });

  const handleFixAllPermissions = async () => {
    setIsFixing(true);
    setFixResult(null);
    fixAllPermissions.mutate();
  };

  const handleSyncPermissions = () => {
    syncPermissions.mutate();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          权限修复管理
        </h1>
        <p className="text-gray-600">
          检查和修复用户权限配置问题
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="integrity">完整性检查</TabsTrigger>
          <TabsTrigger value="fix">修复工具</TabsTrigger>
        </TabsList>

        {/* 概览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                权限配置概览
              </CardTitle>
              <CardDescription>
                当前系统中的用户等级和权限配置统计
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview ? (
                <div className="space-y-6">
                  {/* 统计信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {overview.totalUsers}
                      </div>
                      <div className="text-sm text-blue-800">总用户数</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {overview.permissionConfigs.length}
                      </div>
                      <div className="text-sm text-green-800">权限配置数</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {overview.inconsistentCount}
                      </div>
                      <div className="text-sm text-red-800">权限不一致用户</div>
                    </div>
                  </div>

                  {/* 用户等级统计 */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">用户等级分布</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {overview.userLevelStats.map((stat: any) => (
                        <div key={stat.userLevel} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{stat.userLevel}</span>
                            <Badge variant="secondary">{stat._count.id} 用户</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 权限配置列表 */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">权限配置详情</h4>
                    <div className="space-y-2">
                      {overview.permissionConfigs.map((config: any) => (
                        <div key={config.userLevel} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">{config.userLevel}</span>
                              <div className="text-sm text-gray-600 mt-1">
                                发布作品: {config.canPublishPosts ? '✅' : '❌'} | 
                                发布动态: {config.canPublishMoments ? '✅' : '❌'} | 
                                上传图片: {config.canUploadImages ? '✅' : '❌'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">加载权限概览中...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 完整性检查标签页 */}
        <TabsContent value="integrity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                权限完整性检查
              </CardTitle>
              <CardDescription>
                检查权限配置的完整性和一致性
              </CardDescription>
            </CardHeader>
            <CardContent>
              {integrityCheck ? (
                <div className="space-y-4">
                  {/* 整体状态 */}
                  <Alert>
                    <div className="flex items-center gap-2">
                      {integrityCheck.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <AlertDescription>
                        {integrityCheck.success 
                          ? '✅ 权限配置完整，所有用户权限一致'
                          : '⚠️ 发现权限配置问题，需要修复'
                        }
                      </AlertDescription>
                    </div>
                  </Alert>

                  {/* 缺失的配置 */}
                  {integrityCheck.missingConfigs.length > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">
                        缺失的权限配置
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {integrityCheck.missingConfigs.map((level) => (
                          <Badge key={level} variant="destructive">
                            {level}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 权限不一致的用户 */}
                  {integrityCheck.inconsistentUsers.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-medium text-red-800 mb-2">
                        权限不一致的用户 ({integrityCheck.inconsistentUsers.length})
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {integrityCheck.inconsistentUsers.map((user, index) => (
                          <div key={index} className="text-sm bg-white p-2 rounded border">
                            <span className="font-medium">{user.username}</span>
                            <span className="text-gray-600 ml-2">({user.userLevel})</span>
                            <span className="ml-2">
                              当前: {user.canPublish ? '✅' : '❌'} → 
                              应为: {user.shouldCanPublish ? '✅' : '❌'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => refetchIntegrity()} 
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      重新检查
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">检查权限完整性中...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 修复工具标签页 */}
        <TabsContent value="fix" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                权限修复工具
              </CardTitle>
              <CardDescription>
                执行权限同步和修复操作
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 修复按钮 */}
              <div className="flex gap-4">
                <Button
                  onClick={handleFixAllPermissions}
                  disabled={isFixing}
                  className="flex-1"
                >
                  {isFixing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      修复中...
                    </>
                  ) : (
                    '🔧 完整修复所有权限'
                  )}
                </Button>
                
                <Button
                  onClick={handleSyncPermissions}
                  variant="outline"
                  disabled={syncPermissions.isPending}
                >
                  {syncPermissions.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      同步中...
                    </>
                  ) : (
                    '🔄 仅同步权限'
                  )}
                </Button>
              </div>

              {/* 修复结果 */}
              {fixResult && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">修复结果</h4>
                  
                  <Alert className="mb-4">
                    <div className="flex items-center gap-2">
                      {fixResult.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <AlertDescription>
                        {fixResult.summary}
                      </AlertDescription>
                    </div>
                  </Alert>

                  <div className="space-y-3 text-sm">
                    {fixResult.details.integrityCheck && (
                      <div>
                        <span className="font-medium">完整性检查:</span>
                        <span className="ml-2">
                          {fixResult.details.integrityCheck.success ? '✅ 通过' : '❌ 失败'}
                        </span>
                      </div>
                    )}
                    
                    {fixResult.details.missingConfigsInit && (
                      <div>
                        <span className="font-medium">配置初始化:</span>
                        <span className="ml-2">
                          创建了 {fixResult.details.missingConfigsInit.createdConfigs} 个配置
                        </span>
                      </div>
                    )}
                    
                    {fixResult.details.permissionSync && (
                      <div>
                        <span className="font-medium">权限同步:</span>
                        <span className="ml-2">
                          更新了 {fixResult.details.permissionSync.updatedUsers} 个用户
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 操作说明 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">操作说明</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>完整修复</strong>: 检查并修复所有权限问题，包括创建缺失配置和同步用户权限</li>
                  <li>• <strong>仅同步</strong>: 只同步现有用户的权限，不创建新的权限配置</li>
                  <li>• 修复过程是安全的，不会删除任何数据</li>
                  <li>• 建议在修复前先查看概览和完整性检查结果</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
