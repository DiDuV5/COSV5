/**
 * @fileoverview 互动奖励配置组件
 * @description 用户等级互动奖励配置表单组件
 */

"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart } from "lucide-react";
import {
  type CansConfigForm,
  FORM_VALIDATION_RULES
} from "../types/user-level-types";

interface InteractionRewardsConfigProps {
  register: UseFormRegister<CansConfigForm>;
  errors: FieldErrors<CansConfigForm>;
  isEditing: boolean;
  config: CansConfigForm;
}

/**
 * 互动奖励配置组件
 */
export function InteractionRewardsConfig({
  register,
  errors,
  isEditing,
  config
}: InteractionRewardsConfigProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Heart className="h-4 w-4" />
        <h4 className="font-medium">互动奖励</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="likeCans">点赞奖励</Label>
          <Input
            id="likeCans"
            type="number"
            min="0"
            max="100"
            disabled={!isEditing}
            defaultValue={config.likeCans}
            {...register("likeCans", {
              required: FORM_VALIDATION_RULES.likeCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.likeCans.min,
              max: FORM_VALIDATION_RULES.likeCans.max
            })}
          />
          {errors.likeCans && (
            <p className="text-sm text-red-500 mt-1">{errors.likeCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户点赞他人内容获得的罐头
          </p>
        </div>

        <div>
          <Label htmlFor="commentCans">评论奖励</Label>
          <Input
            id="commentCans"
            type="number"
            min="0"
            max="100"
            disabled={!isEditing}
            defaultValue={config.commentCans}
            {...register("commentCans", {
              required: FORM_VALIDATION_RULES.commentCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.commentCans.min,
              max: FORM_VALIDATION_RULES.commentCans.max
            })}
          />
          {errors.commentCans && (
            <p className="text-sm text-red-500 mt-1">{errors.commentCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户评论他人内容获得的罐头
          </p>
        </div>

        <div>
          <Label htmlFor="shareCans">分享奖励</Label>
          <Input
            id="shareCans"
            type="number"
            min="0"
            max="100"
            disabled={!isEditing}
            defaultValue={config.shareCans}
            {...register("shareCans", {
              required: FORM_VALIDATION_RULES.shareCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.shareCans.min,
              max: FORM_VALIDATION_RULES.shareCans.max
            })}
          />
          {errors.shareCans && (
            <p className="text-sm text-red-500 mt-1">{errors.shareCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户分享内容获得的罐头
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-pink-50 rounded-lg">
        <h5 className="text-sm font-medium text-pink-800 mb-2">互动奖励说明</h5>
        <ul className="text-xs text-pink-700 space-y-1">
          <li>• 点赞奖励：鼓励用户积极点赞，增加社区活跃度</li>
          <li>• 评论奖励：鼓励用户发表有价值的评论</li>
          <li>• 分享奖励：鼓励用户分享优质内容，扩大平台影响力</li>
          <li>• 建议设置：点赞1-3罐头，评论3-5罐头，分享5-10罐头</li>
        </ul>
      </div>
    </div>
  );
}
