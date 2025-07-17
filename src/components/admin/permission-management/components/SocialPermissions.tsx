/**
 * @fileoverview 社交权限配置组件
 * @description 配置用户的社交账号功能权限
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
  Users,
  ExternalLink,
} from "lucide-react";
import type { PermissionSectionProps } from "../types";

export function SocialPermissions({ form }: PermissionSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="canUseSocialLinks"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  社交账号功能
                </FormLabel>
                <FormDescription>
                  允许用户使用社交账号功能
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
          name="maxSocialLinks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>最大社交账号数量</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  placeholder="最多可添加的社交账号数量"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                用户最多可以添加的社交账号数量
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="canUseCustomLinks"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  自定义链接
                </FormLabel>
                <FormDescription>
                  允许用户添加自定义链接
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
