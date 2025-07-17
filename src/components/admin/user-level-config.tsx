/**
 * @fileoverview 用户等级配置组件 (重构版)
 * @description 管理员配置不同用户等级的罐头奖励和行为限制，采用模块化架构
 * @author Augment AI
 * @date 2025-06-27
 * @version 2.0.0
 * @since 1.0.0
 *
 * @example
 * <UserLevelConfig userLevel="USER" displayName="普通用户" color="bg-blue-100 text-blue-800" />
 *
 * @dependencies
 * - react-hook-form: ^7.0.0
 * - @/trpc/react: tRPC客户端
 * - @/components/ui: UI组件库
 *
 * @changelog
 * - 2025-06-27: 初始版本创建
 * - 2025-06-29: v2.0.0 重构为模块化架构
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Save, X, RotateCcw, AlertTriangle } from "lucide-react";

// 导入拆分的组件和Hook
import { BasicRewardsConfig } from "./user-level-config/components/BasicRewardsConfig";
import { InteractionRewardsConfig } from "./user-level-config/components/InteractionRewardsConfig";
import { CreationRewardsConfig } from "./user-level-config/components/CreationRewardsConfig";
import { BehaviorLimitsConfig } from "./user-level-config/components/BehaviorLimitsConfig";
import { PassiveRewardsConfig } from "./user-level-config/components/PassiveRewardsConfig";
import { SpecialRewardsConfig } from "./user-level-config/components/SpecialRewardsConfig";
import { useUserLevelConfig, useConfigValidation } from "./user-level-config/hooks/use-user-level-config";

// 导入类型和函数
import {
  type UserLevelConfigProps,
  getUserLevelDisplayInfo
} from "./user-level-config/types/user-level-types";

/**
 * 用户等级配置组件 (重构版)
 */
export function UserLevelConfig({ userLevel, displayName, color }: UserLevelConfigProps) {
  // 使用重构的Hook
  const {
    isEditing,
    config,
    isPending,
    register,
    handleSubmit,
    errors,
    isDirty,
    handleEdit,
    handleCancel,
    handleSave,
    handleReset,
    isSaving,
    isResetting,
  } = useUserLevelConfig({ userLevel, displayName });

  // 配置验证Hook
  const { validateConfig } = useConfigValidation();

  // 获取用户等级显示信息
  const levelInfo = getUserLevelDisplayInfo(userLevel);

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Badge className={color}>{displayName}</Badge>
                配置
              </CardTitle>
              <CardDescription>
                配置 {displayName} 等级的罐头奖励和行为限制
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">加载配置中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Badge className={color}>{displayName}</Badge>
                配置
              </CardTitle>
              <CardDescription>
                配置 {displayName} 等级的罐头奖励和行为限制
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-red-500">配置加载失败</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 验证当前配置
  const validation = validateConfig(config);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Badge className={color}>{displayName}</Badge>
              配置
            </CardTitle>
            <CardDescription>
              {levelInfo.description}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  disabled={isSaving || isResetting}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isSaving || isResetting}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  重置
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-1" />
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit(handleSave)}
                  disabled={!isDirty || isSaving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? '保存中...' : '保存'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* 配置验证警告 */}
        {!validation.isValid && validation.warnings.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-yellow-800 mb-1">配置建议</h5>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
          {/* 基础奖励配置 */}
          <BasicRewardsConfig
            register={register}
            errors={errors}
            isEditing={isEditing}
            config={config}
          />

          <Separator />

          {/* 互动奖励配置 */}
          <InteractionRewardsConfig
            register={register}
            errors={errors}
            isEditing={isEditing}
            config={config}
          />

          <Separator />

          {/* 创作奖励配置 */}
          <CreationRewardsConfig
            register={register}
            errors={errors}
            isEditing={isEditing}
            config={config}
          />

          <Separator />

          {/* 行为限制配置 */}
          <BehaviorLimitsConfig
            register={register}
            errors={errors}
            isEditing={isEditing}
            config={config}
          />

          <Separator />

          {/* 被动奖励配置 */}
          <PassiveRewardsConfig
            register={register}
            errors={errors}
            isEditing={isEditing}
            config={config}
          />

          <Separator />

          {/* 特殊奖励配置 */}
          <SpecialRewardsConfig
            register={register}
            errors={errors}
            isEditing={isEditing}
            config={config}
          />
        </form>

        {/* 配置说明 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-800 mb-2">配置说明</h5>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 罐头是平台的虚拟货币，用户可通过各种行为获得</li>
            <li>• 合理设置奖励和限制，平衡用户激励和平台经济</li>
            <li>• 建议定期根据平台数据调整配置参数</li>
            <li>• 重置操作将恢复到系统默认配置，请谨慎使用</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
