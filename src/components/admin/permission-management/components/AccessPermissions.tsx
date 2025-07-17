/**
 * @fileoverview 访问权限配置组件
 * @description 配置用户的查看、播放、互动权限
 */

"use client";

import React from "react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  Play,
  Heart,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import type { PermissionSectionProps } from "../types";

export function AccessPermissions({ form }: PermissionSectionProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          访问权限主要针对游客用户。注册用户及以上等级通常拥有完整的访问权限。
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 基础访问权限 */}
        <FormField
          control={form.control}
          name="canViewPosts"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  查看内容
                </FormLabel>
                <FormDescription>
                  允许查看发布的内容
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
          name="canPlayVideos"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  播放视频
                </FormLabel>
                <FormDescription>
                  允许播放视频内容
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

        {/* 互动权限 */}
        <FormField
          control={form.control}
          name="canLikePosts"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  点赞内容
                </FormLabel>
                <FormDescription>
                  允许为内容点赞
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
          name="canComment"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  发表评论
                </FormLabel>
                <FormDescription>
                  允许发表评论
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
      </div>
    </div>
  );
}
