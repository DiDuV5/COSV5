/**
 * @fileoverview 发布权限配置组件
 * @description 配置用户的发布动态和作品权限
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
  MessageSquare,
  FileText,
} from "lucide-react";
import type { PermissionSectionProps } from "../types";

export function PublishingPermissions({ form }: PermissionSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 动态发布权限 */}
        <FormField
          control={form.control}
          name="canPublishMoments"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  发布动态权限
                </FormLabel>
                <FormDescription>
                  允许用户发布动态内容
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
          name="dailyMomentsLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>每日动态发布限制</FormLabel>
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
                -1 表示无限制，0 表示禁止发布
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 作品发布权限 */}
        <FormField
          control={form.control}
          name="canPublishPosts"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  发布作品权限
                </FormLabel>
                <FormDescription>
                  允许用户发布正式作品
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
          name="dailyPostsLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>每日作品发布限制</FormLabel>
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
                -1 表示无限制，0 表示禁止发布
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
