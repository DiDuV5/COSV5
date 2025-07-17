/**
 * @fileoverview 行为限制配置组件
 * @description 用户等级行为限制配置表单组件
 */

"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";
import {
  type CansConfigForm,
  FORM_VALIDATION_RULES
} from "../types/user-level-types";

interface BehaviorLimitsConfigProps {
  register: UseFormRegister<CansConfigForm>;
  errors: FieldErrors<CansConfigForm>;
  isEditing: boolean;
  config: CansConfigForm;
}

/**
 * 行为限制配置组件
 */
export function BehaviorLimitsConfig({
  register,
  errors,
  isEditing,
  config
}: BehaviorLimitsConfigProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-4 w-4" />
        <h4 className="font-medium">行为限制</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="dailyLikeLimit">每日点赞上限</Label>
          <Input
            id="dailyLikeLimit"
            type="number"
            min="0"
            max="1000"
            disabled={!isEditing}
            defaultValue={config.dailyLikeLimit}
            {...register("dailyLikeLimit", {
              required: FORM_VALIDATION_RULES.dailyLikeLimit.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.dailyLikeLimit.min,
              max: FORM_VALIDATION_RULES.dailyLikeLimit.max
            })}
          />
          {errors.dailyLikeLimit && (
            <p className="text-sm text-red-500 mt-1">{errors.dailyLikeLimit.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户每日最多可以点赞的次数
          </p>
        </div>

        <div>
          <Label htmlFor="dailyCommentLimit">每日评论上限</Label>
          <Input
            id="dailyCommentLimit"
            type="number"
            min="0"
            max="100"
            disabled={!isEditing}
            defaultValue={config.dailyCommentLimit}
            {...register("dailyCommentLimit", {
              required: FORM_VALIDATION_RULES.dailyCommentLimit.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.dailyCommentLimit.min,
              max: FORM_VALIDATION_RULES.dailyCommentLimit.max
            })}
          />
          {errors.dailyCommentLimit && (
            <p className="text-sm text-red-500 mt-1">{errors.dailyCommentLimit.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户每日最多可以评论的次数
          </p>
        </div>

        <div>
          <Label htmlFor="dailyShareLimit">每日分享上限</Label>
          <Input
            id="dailyShareLimit"
            type="number"
            min="0"
            max="100"
            disabled={!isEditing}
            defaultValue={config.dailyShareLimit}
            {...register("dailyShareLimit", {
              required: FORM_VALIDATION_RULES.dailyShareLimit.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.dailyShareLimit.min,
              max: FORM_VALIDATION_RULES.dailyShareLimit.max
            })}
          />
          {errors.dailyShareLimit && (
            <p className="text-sm text-red-500 mt-1">{errors.dailyShareLimit.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户每日最多可以分享的次数
          </p>
        </div>

        <div>
          <Label htmlFor="dailyMomentLimit">每日动态上限</Label>
          <Input
            id="dailyMomentLimit"
            type="number"
            min="0"
            max="50"
            disabled={!isEditing}
            defaultValue={config.dailyMomentLimit}
            {...register("dailyMomentLimit", {
              required: FORM_VALIDATION_RULES.dailyMomentLimit.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.dailyMomentLimit.min,
              max: FORM_VALIDATION_RULES.dailyMomentLimit.max
            })}
          />
          {errors.dailyMomentLimit && (
            <p className="text-sm text-red-500 mt-1">{errors.dailyMomentLimit.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户每日最多可以发布的动态数
          </p>
        </div>

        <div>
          <Label htmlFor="dailyPostLimit">每日作品上限</Label>
          <Input
            id="dailyPostLimit"
            type="number"
            min="0"
            max="20"
            disabled={!isEditing}
            defaultValue={config.dailyPostLimit}
            {...register("dailyPostLimit", {
              required: FORM_VALIDATION_RULES.dailyPostLimit.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.dailyPostLimit.min,
              max: FORM_VALIDATION_RULES.dailyPostLimit.max
            })}
          />
          {errors.dailyPostLimit && (
            <p className="text-sm text-red-500 mt-1">{errors.dailyPostLimit.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户每日最多可以发布的作品数
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <h5 className="text-sm font-medium text-yellow-800 mb-2">行为限制说明</h5>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• 点赞上限：防止恶意刷赞，建议普通用户100-200次，VIP用户300-500次</li>
          <li>• 评论上限：防止垃圾评论，建议普通用户20-50次，VIP用户50-100次</li>
          <li>• 分享上限：防止恶意刷分享，建议普通用户10-30次</li>
          <li>• 动态上限：防止刷屏，建议普通用户5-10条，创作者15-30条</li>
          <li>• 作品上限：防止低质量内容，建议普通用户1-3个，创作者5-10个</li>
          <li>• 设置为0表示无限制，请谨慎使用</li>
        </ul>
      </div>
    </div>
  );
}
