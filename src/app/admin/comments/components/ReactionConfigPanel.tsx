/**
 * @fileoverview 反应系统配置管理组件
 * @description 管理评论反应系统的配置
 */

"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, Loader2 } from "lucide-react";
import type { ReactionConfig, ConfigForm } from "../types";
import { validateConfigForm } from "../utils";

interface ReactionConfigPanelProps {
  reactionConfig?: ReactionConfig;
  isLoadingConfig: boolean;
  configForm: ConfigForm;
  onConfigFormChange: (config: ConfigForm | ((prev: ConfigForm) => ConfigForm)) => void;
  onSaveConfig: () => void;
  onResetConfig: () => void;
  isSaving: boolean;
  isResetting: boolean;
}

export function ReactionConfigPanel({
  reactionConfig,
  isLoadingConfig,
  configForm,
  onConfigFormChange,
  onSaveConfig,
  onResetConfig,
  isSaving,
  isResetting,
}: ReactionConfigPanelProps) {
  const validation = validateConfigForm(configForm);

  const handleSave = () => {
    if (!validation.isValid) {
      return;
    }
    onSaveConfig();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            反应系统配置管理
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onResetConfig}
              disabled={isResetting}
            >
              {isResetting ? "重置中..." : "重置默认"}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !validation.isValid}
            >
              {isSaving ? "保存中..." : "保存配置"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingConfig ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">加载配置中...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 热度计算配置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">热度计算权重</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">点赞权重 (-10 到 +10):</label>
                    <Input
                      type="number"
                      min="-10"
                      max="10"
                      value={configForm.likeWeight}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          return;
                        }
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue >= -10 && numValue <= 10) {
                          onConfigFormChange(prev => ({
                            ...prev,
                            likeWeight: numValue
                          }));
                        }
                      }}
                      className="w-24"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">点踩权重 (-10 到 +10):</label>
                    <Input
                      type="number"
                      min="-10"
                      max="10"
                      value={configForm.dislikeWeight}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || value === '-') {
                          return;
                        }
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue >= -10 && numValue <= 10) {
                          onConfigFormChange(prev => ({
                            ...prev,
                            dislikeWeight: numValue
                          }));
                        }
                      }}
                      className="w-24"
                    />
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    热度分数 = 点赞数 × {configForm.likeWeight} + 点踩数 × {configForm.dislikeWeight}
                  </div>
                </div>
              </div>

              {/* 反应功能开关 */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">功能开关</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">启用点赞功能:</label>
                    <Checkbox
                      checked={configForm.enableLike}
                      onCheckedChange={(checked) => onConfigFormChange(prev => ({
                        ...prev,
                        enableLike: checked as boolean
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">启用点踩功能:</label>
                    <Checkbox
                      checked={configForm.enableDislike}
                      onCheckedChange={(checked) => onConfigFormChange(prev => ({
                        ...prev,
                        enableDislike: checked as boolean
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">显示具体数量:</label>
                    <Checkbox
                      checked={configForm.showCounts}
                      onCheckedChange={(checked) => onConfigFormChange(prev => ({
                        ...prev,
                        showCounts: checked as boolean
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 配置说明 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">配置说明:</label>
              <Input
                placeholder="输入配置说明..."
                value={configForm.description}
                onChange={(e) => onConfigFormChange(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
              />
            </div>

            {/* 验证错误显示 */}
            {!validation.isValid && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <h5 className="font-medium text-sm text-red-800 mb-2">配置错误：</h5>
                <ul className="text-xs text-red-700 space-y-1">
                  {validation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 配置说明和示例 */}
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-sm text-blue-800 mb-2">配置说明：</h5>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• <strong>点赞权重</strong>：每个点赞对热度分数的贡献值，建议设置为正数</li>
                  <li>• <strong>点踩权重</strong>：每个点踩对热度分数的影响值，建议设置为负数</li>
                  <li>• <strong>功能开关</strong>：控制前端是否显示相应的反应按钮</li>
                  <li>• <strong>显示数量</strong>：控制是否显示具体的点赞/点踩数量</li>
                </ul>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <h5 className="font-medium text-sm text-green-800 mb-2">推荐配置：</h5>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• <strong>平衡模式</strong>：点赞权重 +1，点踩权重 -1</li>
                  <li>• <strong>正向鼓励</strong>：点赞权重 +2，点踩权重 -1</li>
                  <li>• <strong>严格筛选</strong>：点赞权重 +1，点踩权重 -3（当前默认）</li>
                </ul>
              </div>

              {reactionConfig && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-sm text-gray-800 mb-2">当前配置信息：</h5>
                  <div className="text-xs text-gray-600 space-y-1">
                    <p>创建时间：{new Date(reactionConfig.createdAt).toLocaleString('zh-CN')}</p>
                    <p>更新时间：{new Date(reactionConfig.updatedAt).toLocaleString('zh-CN')}</p>
                    {reactionConfig.updater && (
                      <p>最后更新者：{reactionConfig.updater.displayName || reactionConfig.updater.username}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
