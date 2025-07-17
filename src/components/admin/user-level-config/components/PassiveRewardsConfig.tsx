/**
 * @fileoverview 被动奖励配置组件
 * @description 用户等级被动奖励配置表单组件
 */

"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift } from "lucide-react";
import {
  type CansConfigForm,
  FORM_VALIDATION_RULES
} from "../types/user-level-types";

interface PassiveRewardsConfigProps {
  register: UseFormRegister<CansConfigForm>;
  errors: FieldErrors<CansConfigForm>;
  isEditing: boolean;
  config: CansConfigForm;
}

/**
 * 被动奖励配置组件
 */
export function PassiveRewardsConfig({
  register,
  errors,
  isEditing,
  config
}: PassiveRewardsConfigProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Gift className="h-4 w-4" />
        <h4 className="font-medium">被动奖励</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="beLikedCans">被点赞奖励</Label>
          <Input
            id="beLikedCans"
            type="number"
            min="0"
            max="50"
            disabled={!isEditing}
            defaultValue={config.beLikedCans}
            {...register("beLikedCans", {
              required: FORM_VALIDATION_RULES.beLikedCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.beLikedCans.min,
              max: FORM_VALIDATION_RULES.beLikedCans.max
            })}
          />
          {errors.beLikedCans && (
            <p className="text-sm text-red-500 mt-1">{errors.beLikedCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户内容被他人点赞获得的罐头
          </p>
        </div>

        <div>
          <Label htmlFor="beCommentedCans">被评论奖励</Label>
          <Input
            id="beCommentedCans"
            type="number"
            min="0"
            max="50"
            disabled={!isEditing}
            defaultValue={config.beCommentedCans}
            {...register("beCommentedCans", {
              required: FORM_VALIDATION_RULES.beCommentedCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.beCommentedCans.min,
              max: FORM_VALIDATION_RULES.beCommentedCans.max
            })}
          />
          {errors.beCommentedCans && (
            <p className="text-sm text-red-500 mt-1">{errors.beCommentedCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户内容被他人评论获得的罐头
          </p>
        </div>

        <div>
          <Label htmlFor="beSharedCans">被分享奖励</Label>
          <Input
            id="beSharedCans"
            type="number"
            min="0"
            max="50"
            disabled={!isEditing}
            defaultValue={config.beSharedCans}
            {...register("beSharedCans", {
              required: FORM_VALIDATION_RULES.beSharedCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.beSharedCans.min,
              max: FORM_VALIDATION_RULES.beSharedCans.max
            })}
          />
          {errors.beSharedCans && (
            <p className="text-sm text-red-500 mt-1">{errors.beSharedCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户内容被他人分享获得的罐头
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-purple-50 rounded-lg">
        <h5 className="text-sm font-medium text-purple-800 mb-2">被动奖励说明</h5>
        <ul className="text-xs text-purple-700 space-y-1">
          <li>• 被点赞奖励：鼓励用户创作受欢迎的内容</li>
          <li>• 被评论奖励：鼓励用户创作引发讨论的内容</li>
          <li>• 被分享奖励：鼓励用户创作值得传播的优质内容</li>
          <li>• 建议设置：被点赞1-3罐头，被评论3-5罐头，被分享5-10罐头</li>
          <li>• 创作者等级可以设置更高的被动奖励以鼓励优质创作</li>
        </ul>
      </div>
    </div>
  );
}
