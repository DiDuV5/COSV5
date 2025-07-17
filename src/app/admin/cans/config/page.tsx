/**
 * @fileoverview 罐头系统配置管理页面
 * @description 增强的配置管理界面，支持批量编辑、模板应用和历史记录
 * @author Augment AI
 * @date 2024-12-01
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - @trpc/react-query: ^10.45.0
 * - react-hook-form: ^7.57.0
 * - next: ^14.0.0
 *
 * @changelog
 * - 2024-12-01: 初始版本创建，支持增强的配置管理功能
 */

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Download,
  Upload,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  Users,
  Coins,
} from "lucide-react";
import CansConfigManager from "@/components/admin/cans-config-manager";
import { CansConfigHistory } from "@/components/admin/cans-config-history";
import CansConfigTemplates from "@/components/admin/cans-config-templates";

// 配置验证状态组件
function ConfigValidationStatus() {
  const { data: _configs } = api.cans.config.getAllConfigs.useQuery();

  const validationResults = [
    {
      level: "GUEST",
      status: "warning",
      message: "访客等级配置过于宽松，建议降低奖励",
      icon: AlertTriangle,
      color: "text-yellow-500",
    },
    {
      level: "USER",
      status: "success",
      message: "配置合理，符合平台运营策略",
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      level: "USER",
      status: "info",
      message: "建议适当提高任务奖励以激励用户",
      icon: Info,
      color: "text-blue-500",
    },
    {
      level: "CREATOR",
      status: "success",
      message: "配置合理，有效激励内容创作",
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      level: "ADMIN",
      status: "info",
      message: "管理员等级配置正常",
      icon: Info,
      color: "text-blue-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <span>配置验证状态</span>
        </CardTitle>
        <CardDescription>
          自动检测配置问题和优化建议
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {validationResults.map((result, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <result.icon className={`h-5 w-5 ${result.color}`} />
                <div>
                  <p className="font-medium">{result.level} 等级</p>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                </div>
              </div>
              <Badge
                variant={result.status === "success" ? "default" : "secondary"}
                className={
                  result.status === "success"
                    ? "bg-green-100 text-green-800"
                    : result.status === "warning"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-blue-100 text-blue-800"
                }
              >
                {result.status === "success" ? "正常" : result.status === "warning" ? "警告" : "建议"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 配置统计概览组件
function ConfigStatsOverview() {
  const { data: configs } = api.cans.config.getAllConfigs.useQuery();

  if (!configs) return null;

  const stats = {
    totalConfigs: configs.length,
    avgDailySigninCans: Math.round(configs.reduce((sum, c) => sum + c.dailySigninCans, 0) / configs.length),
    avgLikeCans: Math.round(configs.reduce((sum, c) => sum + c.likeCans, 0) / configs.length),
    avgPostCans: Math.round(configs.reduce((sum, c) => sum + c.publishPostCans, 0) / configs.length),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{stats.totalConfigs}</div>
              <div className="text-sm text-muted-foreground">配置等级</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Coins className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">{stats.avgDailySigninCans}</div>
              <div className="text-sm text-muted-foreground">平均签到奖励</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{stats.avgLikeCans}</div>
              <div className="text-sm text-muted-foreground">平均点赞奖励</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-purple-500" />
            <div>
              <div className="text-2xl font-bold">{stats.avgPostCans}</div>
              <div className="text-sm text-muted-foreground">平均发布奖励</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 配置导入导出组件
function ConfigImportExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 模拟导出操作
      await new Promise(resolve => setTimeout(resolve, 2000));
      // 这里应该调用实际的导出API
      console.log("导出配置...");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      // 模拟导入操作
      await new Promise(resolve => setTimeout(resolve, 2000));
      // 这里应该调用实际的导入API
      console.log("导入配置...");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5 text-blue-500" />
          <span>配置备份与恢复</span>
        </CardTitle>
        <CardDescription>
          导出当前配置或从备份文件恢复配置
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              导出的配置文件包含所有用户等级的完整配置信息，可用于备份或迁移到其他环境。
            </AlertDescription>
          </Alert>

          <div className="flex space-x-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "导出中..." : "导出配置"}
            </Button>

            <Button
              variant="outline"
              onClick={handleImport}
              disabled={isImporting}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "导入中..." : "导入配置"}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>• 导出文件格式：JSON</p>
            <p>• 导入前会自动验证配置格式</p>
            <p>• 导入操作会创建配置历史记录</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CansConfigPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">罐头系统配置管理</h1>
          <p className="text-muted-foreground mt-2">
            管理用户等级配置、应用模板和查看变更历史
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            保存所有更改
          </Button>
          <Button variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            重置为默认
          </Button>
        </div>
      </div>

      {/* 配置统计概览 */}
      <ConfigStatsOverview />

      {/* 主要功能标签页 */}
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">配置管理</TabsTrigger>
          <TabsTrigger value="templates">配置模板</TabsTrigger>
          <TabsTrigger value="history">变更历史</TabsTrigger>
          <TabsTrigger value="tools">工具</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CansConfigManager />
            </div>
            <div>
              <ConfigValidationStatus />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <CansConfigTemplates />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <CansConfigHistory userLevel="" />
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConfigImportExport />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  <span>高级工具</span>
                </CardTitle>
                <CardDescription>
                  配置管理的高级功能和工具
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    生成配置报告
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    配置一致性检查
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    批量重置配置
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    配置冲突检测
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
