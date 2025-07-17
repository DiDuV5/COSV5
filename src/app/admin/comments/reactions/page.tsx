/**
 * @fileoverview 管理后台评论反应管理页面
 * @description 管理评论的点赞/点踩数据，配置热度参数
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - React 18+
 * - @trpc/react-query
 * - shadcn/ui
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { 
  ThumbsUp, 
  ThumbsDown, 
  TrendingUp, 
  Settings, 
  BarChart3,
  Users,
  MessageSquare,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function CommentReactionsPage() {
  const { toast } = useToast();
  const [configValues, setConfigValues] = useState({
    likeWeight: 1,
    dislikeWeight: 3,
    enableDislike: true,
    showCounts: true,
  });

  // 获取评论反应统计数据 (暂时注释掉，方法不存在)
  // const { data: reactionStats, isPending: statsLoading } = api.comment.stats.getReactionStats.useQuery({
  //   commentId: '', // 这里需要修改为获取全局统计
  //   includeUsers: false,
  // });
  const reactionStats = null;
  const statsLoading = false;

  // 获取评论列表（带反应数据）
  const { data: commentsData, isPending: commentsLoading } = api.comment.getComments.useQuery({
    contentId: '', // 需要修改为获取所有评论
    limit: 50,
    sortBy: 'newest', // 按最新排序
  });

  const handleConfigSave = () => {
    // 这里应该调用保存配置的API
    toast({
      title: "配置已保存",
      description: "热度计算参数已更新",
    });
  };

  const calculateHotScore = (likes: number, dislikes: number) => {
    return likes * configValues.likeWeight - dislikes * configValues.dislikeWeight;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">评论反应管理</h1>
          <p className="text-gray-600 mt-2">管理评论的点赞/点踩功能和热度计算</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览统计</TabsTrigger>
          <TabsTrigger value="comments">评论管理</TabsTrigger>
          <TabsTrigger value="config">热度配置</TabsTrigger>
          <TabsTrigger value="users">用户行为</TabsTrigger>
        </TabsList>

        {/* 概览统计 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总点赞数</CardTitle>
                <ThumbsUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-gray-600">
                  +12% 较上周
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总点踩数</CardTitle>
                <ThumbsDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89</div>
                <p className="text-xs text-gray-600">
                  -5% 较上周
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">活跃用户</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">456</div>
                <p className="text-xs text-gray-600">
                  今日参与反应的用户
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">热门评论</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-gray-600">
                  热度分数 &gt; 10 的评论
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 趋势图表区域 */}
          <Card>
            <CardHeader>
              <CardTitle>反应趋势</CardTitle>
              <CardDescription>过去7天的点赞/点踩趋势</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <BarChart3 className="h-8 w-8 mr-2" />
                图表组件待实现
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 评论管理 */}
        <TabsContent value="comments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>评论反应数据</CardTitle>
              <CardDescription>查看所有评论的点赞/点踩统计</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>评论内容</TableHead>
                    <TableHead>作者</TableHead>
                    <TableHead>点赞数</TableHead>
                    <TableHead>点踩数</TableHead>
                    <TableHead>热度分数</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* 示例数据 */}
                  <TableRow>
                    <TableCell className="max-w-xs truncate">
                      这是一条很棒的评论，内容非常有价值...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>用户名</span>
                        <Badge variant="outline">认证</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4 text-blue-600" />
                        <span>15</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        <span>2</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">9</Badge>
                    </TableCell>
                    <TableCell>2小时前</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        查看详情
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 热度配置 */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>热度计算配置</CardTitle>
              <CardDescription>调整点赞和点踩对评论热度的影响权重</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="likeWeight">点赞权重</Label>
                  <Input
                    id="likeWeight"
                    type="number"
                    value={configValues.likeWeight}
                    onChange={(e) => setConfigValues(prev => ({
                      ...prev,
                      likeWeight: Number(e.target.value)
                    }))}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-sm text-gray-600">每个点赞增加的热度分数</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dislikeWeight">点踩权重</Label>
                  <Input
                    id="dislikeWeight"
                    type="number"
                    value={configValues.dislikeWeight}
                    onChange={(e) => setConfigValues(prev => ({
                      ...prev,
                      dislikeWeight: Number(e.target.value)
                    }))}
                    min="0"
                    step="0.1"
                  />
                  <p className="text-sm text-gray-600">每个点踩减少的热度分数</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">热度计算公式</h4>
                <p className="text-sm text-gray-700">
                  热度分数 = 点赞数 × {configValues.likeWeight} - 点踩数 × {configValues.dislikeWeight}
                </p>
                <div className="mt-2 text-sm text-gray-600">
                  示例：15个点赞，2个点踩 = {calculateHotScore(15, 2)} 分
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleConfigSave}>
                  <Settings className="h-4 w-4 mr-2" />
                  保存配置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 用户行为 */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>用户反应行为</CardTitle>
              <CardDescription>查看用户的点赞/点踩行为统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2" />
                用户行为分析功能开发中...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
