/**
 * @fileoverview 基础奖励配置组件
 * @description 用户等级基础奖励配置表单组件
 */

"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins } from "lucide-react";
import {
  type CansConfigForm,
  FORM_VALIDATION_RULES
} from "../types/user-level-types";

interface BasicRewardsConfigProps {
  register: UseFormRegister<CansConfigForm>;
  errors: FieldErrors<CansConfigForm>;
  isEditing: boolean;
  config: CansConfigForm;
}

/**
 * 基础奖励配置组件
 */
export function BasicRewardsConfig({
  register,
  errors,
  isEditing,
  config
}: BasicRewardsConfigProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Coins className="h-4 w-4" />
        <h4 className="font-medium">基础奖励</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dailySigninCans">每日基础罐头</Label>
          <Input
            id="dailySigninCans"
            type="number"
            min="0"
            max="1000"
            disabled={!isEditing}
            defaultValue={config.dailySigninCans}
            {...register("dailySigninCans", {
              required: FORM_VALIDATION_RULES.dailySigninCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.dailySigninCans.min,
              max: FORM_VALIDATION_RULES.dailySigninCans.max
            })}
          />
          {errors.dailySigninCans && (
            <p className="text-sm text-red-500 mt-1">{errors.dailySigninCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户每日签到获得的基础罐头数量
          </p>
        </div>

        <div>
          <Label htmlFor="consecutiveBonus">连续签到奖励</Label>
          <Input
            id="consecutiveBonus"
            disabled={!isEditing}
            defaultValue={config.consecutiveBonus}
            {...register("consecutiveBonus", FORM_VALIDATION_RULES.consecutiveBonus)}
          />
          {errors.consecutiveBonus && (
            <p className="text-sm text-red-500 mt-1">{errors.consecutiveBonus.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            连续签到的额外奖励规则（如：7天+50罐头）
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-medium text-blue-800 mb-2">基础奖励说明</h5>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• 每日基础罐头：用户每天签到可获得的固定罐头数量</li>
          <li>• 连续签到奖励：连续签到达到特定天数时的额外奖励</li>
          <li>• 建议设置：普通用户10-20罐头，VIP用户30-50罐头</li>
        </ul>
      </div>
    </div>
  );
}
