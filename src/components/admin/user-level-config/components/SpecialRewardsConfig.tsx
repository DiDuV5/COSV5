/**
 * @fileoverview 特殊奖励配置组件
 * @description 用户等级特殊奖励配置表单组件
 */

"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";
import {
  type CansConfigForm,
  FORM_VALIDATION_RULES
} from "../types/user-level-types";

interface SpecialRewardsConfigProps {
  register: UseFormRegister<CansConfigForm>;
  errors: FieldErrors<CansConfigForm>;
  isEditing: boolean;
  config: CansConfigForm;
}

/**
 * 特殊奖励配置组件
 */
export function SpecialRewardsConfig({
  register,
  errors,
  isEditing,
  config
}: SpecialRewardsConfigProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4" />
        <h4 className="font-medium">特殊奖励</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="specialEventCans">特殊活动奖励</Label>
          <Input
            id="specialEventCans"
            type="number"
            min="0"
            max="1000"
            disabled={!isEditing}
            defaultValue={config.specialEventCans}
            {...register("specialEventCans", {
              required: FORM_VALIDATION_RULES.specialEventCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.specialEventCans.min,
              max: FORM_VALIDATION_RULES.specialEventCans.max
            })}
          />
          {errors.specialEventCans && (
            <p className="text-sm text-red-500 mt-1">{errors.specialEventCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            特殊活动期间的额外奖励
          </p>
        </div>

        <div>
          <Label htmlFor="achievementCans">成就奖励</Label>
          <Input
            id="achievementCans"
            type="number"
            min="0"
            max="500"
            disabled={!isEditing}
            defaultValue={config.achievementCans}
            {...register("achievementCans", {
              required: FORM_VALIDATION_RULES.achievementCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.achievementCans.min,
              max: FORM_VALIDATION_RULES.achievementCans.max
            })}
          />
          {errors.achievementCans && (
            <p className="text-sm text-red-500 mt-1">{errors.achievementCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            完成成就获得的奖励
          </p>
        </div>

        <div>
          <Label htmlFor="referralCans">推荐奖励</Label>
          <Input
            id="referralCans"
            type="number"
            min="0"
            max="200"
            disabled={!isEditing}
            defaultValue={config.referralCans}
            {...register("referralCans", {
              required: FORM_VALIDATION_RULES.referralCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.referralCans.min,
              max: FORM_VALIDATION_RULES.referralCans.max
            })}
          />
          {errors.referralCans && (
            <p className="text-sm text-red-500 mt-1">{errors.referralCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            推荐新用户获得的奖励
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
        <h5 className="text-sm font-medium text-indigo-800 mb-2">特殊奖励说明</h5>
        <ul className="text-xs text-indigo-700 space-y-1">
          <li>• 特殊活动奖励：节日活动、比赛活动等特殊时期的额外奖励</li>
          <li>• 成就奖励：完成特定成就（如首次发布、连续签到等）的奖励</li>
          <li>• 推荐奖励：成功推荐新用户注册并活跃的奖励</li>
          <li>• 建议设置：活动奖励50-200罐头，成就奖励100-500罐头，推荐奖励50-100罐头</li>
          <li>• 这些奖励通常是一次性的，用于激励特定行为</li>
        </ul>
      </div>
    </div>
  );
}
