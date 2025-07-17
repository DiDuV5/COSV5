/**
 * @fileoverview 上传权限配置组件
 * @description 配置用户的图片和视频上传权限
 */

"use client";

import React from "react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Image,
  Video,
} from "lucide-react";
import type { PermissionSectionProps } from "../types";

export function UploadPermissions({ form }: PermissionSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 图片上传权限 */}
        <FormField
          control={form.control}
          name="canUploadImages"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  图片上传权限
                </FormLabel>
                <FormDescription>
                  允许用户上传图片文件
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxImagesPerUpload"
          render={({ field }) => (
            <FormItem>
              <FormLabel>每次最大图片数量</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="-1"
                  placeholder="-1 表示无限制"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                -1 表示无限制，0 表示禁止上传
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 视频上传权限 */}
        <FormField
          control={form.control}
          name="canUploadVideos"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <Video className="w-4 h-4" />
                  视频上传权限
                </FormLabel>
                <FormDescription>
                  允许用户上传视频文件
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="maxVideosPerUpload"
          render={({ field }) => (
            <FormItem>
              <FormLabel>每次最大视频数量</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="-1"
                  placeholder="-1 表示无限制"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                -1 表示无限制，0 表示禁止上传
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
