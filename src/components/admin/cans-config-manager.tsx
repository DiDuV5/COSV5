/**
 * @fileoverview 罐头系统配置管理组件（重构版）
 * @description 管理员用于配置不同用户等级的罐头奖励参数
 * @author Augment AI
 * @date 2025-06-27
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - @trpc/react-query: ^10.45.0
 * - react-hook-form: ^7.0.0
 *
 * @changelog
 * - 2024-12-01: 初始版本创建，支持罐头配置的CRUD操作
 * - 2025-06-27: 模块化重构，拆分为独立组件
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Coins,
  History,
  Brain
} from "lucide-react";

// 导入重构后的组件
import { UserLevelConfig } from "./user-level-config";
import CansConfigHistory from "./cans-config-history";
import CansConfigTemplates from "./cans-config-templates";
import ExperienceConfigManager from "./experience-config-manager";

// 导入类型定义和常量
import {
  type TabType,
  USER_LEVELS
} from './cans-config-types';

/**
 * 罐头配置管理主组件（重构版）
 */
export function CansConfigManager() {
  const [activeTab, setActiveTab] = useState<TabType>('config');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          <Users className="h-6 w-6 text-blue-500" />
          <span>用户等级罐头配置</span>
        </h2>
        <p className="text-muted-foreground mt-2">
          为不同用户等级配置差异化的罐头奖励机制
        </p>
      </div>

      {/* 标签页切换 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Coins className="h-4 w-4" />
            <span>罐头配置</span>
          </TabsTrigger>
          <TabsTrigger value="experience" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>经验值管理</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-2">
            <Coins className="h-4 w-4" />
            <span>配置模板</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>变更历史</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          {USER_LEVELS.map((userLevel) => (
            <UserLevelConfig
              key={userLevel.level}
              userLevel={userLevel.level as any}
              displayName={userLevel.name}
              color={userLevel.color}
            />
          ))}
        </TabsContent>

        <TabsContent value="experience" className="space-y-4">
          {USER_LEVELS.map((userLevel) => (
            <ExperienceConfigManager
              key={userLevel.level}
              userLevel={userLevel.level}
              displayName={userLevel.name}
              color={userLevel.color}
            />
          ))}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <CansConfigTemplates />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <CansConfigHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CansConfigManager;
