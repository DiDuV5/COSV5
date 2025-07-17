/**
 * @fileoverview 创作奖励配置组件
 * @description 用户等级创作奖励配置表单组件
 */

"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenTool } from "lucide-react";
import {
  type CansConfigForm,
  FORM_VALIDATION_RULES
} from "../types/user-level-types";

interface CreationRewardsConfigProps {
  register: UseFormRegister<CansConfigForm>;
  errors: FieldErrors<CansConfigForm>;
  isEditing: boolean;
  config: CansConfigForm;
}

/**
 * 创作奖励配置组件
 */
export function CreationRewardsConfig({
  register,
  errors,
  isEditing,
  config
}: CreationRewardsConfigProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <PenTool className="h-4 w-4" />
        <h4 className="font-medium">创作奖励</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="postCans">发布作品奖励</Label>
          <Input
            id="postCans"
            type="number"
            min="0"
            max="500"
            disabled={!isEditing}
            defaultValue={config.postCans}
            {...register("postCans", {
              required: FORM_VALIDATION_RULES.postCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.postCans.min,
              max: FORM_VALIDATION_RULES.postCans.max
            })}
          />
          {errors.postCans && (
            <p className="text-sm text-red-500 mt-1">{errors.postCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户发布作品获得的罐头
          </p>
        </div>

        <div>
          <Label htmlFor="momentCans">发布动态奖励</Label>
          <Input
            id="momentCans"
            type="number"
            min="0"
            max="200"
            disabled={!isEditing}
            defaultValue={config.momentCans}
            {...register("momentCans", {
              required: FORM_VALIDATION_RULES.momentCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.momentCans.min,
              max: FORM_VALIDATION_RULES.momentCans.max
            })}
          />
          {errors.momentCans && (
            <p className="text-sm text-red-500 mt-1">{errors.momentCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户发布动态获得的罐头
          </p>
        </div>

        <div>
          <Label htmlFor="photoCans">上传照片奖励</Label>
          <Input
            id="photoCans"
            type="number"
            min="0"
            max="100"
            disabled={!isEditing}
            defaultValue={config.photoCans}
            {...register("photoCans", {
              required: FORM_VALIDATION_RULES.photoCans.required,
              valueAsNumber: true,
              min: FORM_VALIDATION_RULES.photoCans.min,
              max: FORM_VALIDATION_RULES.photoCans.max
            })}
          />
          {errors.photoCans && (
            <p className="text-sm text-red-500 mt-1">{errors.photoCans.message}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            用户上传照片获得的罐头
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-green-50 rounded-lg">
        <h5 className="text-sm font-medium text-green-800 mb-2">创作奖励说明</h5>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• 发布作品奖励：鼓励用户创作高质量的cosplay作品</li>
          <li>• 发布动态奖励：鼓励用户分享日常创作过程和心得</li>
          <li>• 上传照片奖励：鼓励用户上传更多精美照片</li>
          <li>• 建议设置：作品50-200罐头，动态20-50罐头，照片5-20罐头</li>
          <li>• 创作者等级可以设置更高的奖励以鼓励持续创作</li>
        </ul>
      </div>
    </div>
  );
}
