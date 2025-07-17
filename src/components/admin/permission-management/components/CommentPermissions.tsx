/**
 * @fileoverview 评论权限配置组件
 * @description 配置用户的评论相关权限
 */

"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  Shield,
  Image,
  Users,
} from "lucide-react";
import type { PermissionSectionProps } from "../types";

export function CommentPermissions({ form, selectedLevel }: PermissionSectionProps) {
  return (
    <div className="space-y-4">
      <Alert>
        <MessageCircle className="h-4 w-4" />
        <AlertDescription>
          评论权限配置控制用户的评论行为，包括是否需要审核、是否可以添加图片等。
          {selectedLevel === "GUEST" && "游客用户的评论权限需要特别配置，建议启用审核机制。"}
        </AlertDescription>
      </Alert>

      {/* 游客专用配置区域 */}
      {selectedLevel === "GUEST" && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
              <Users className="h-4 w-4" />
              游客评论专用配置
            </CardTitle>
            <CardDescription className="text-orange-700">
              游客用户的评论权限配置，建议保持较严格的审核机制
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <div className="font-medium text-sm">游客评论权限</div>
                  <div className="text-xs text-gray-600">允许未注册用户发表评论</div>
                </div>
                <FormField
                  control={form.control}
                  name="canComment"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <div className="font-medium text-sm">强制审核</div>
                  <div className="text-xs text-gray-600">游客评论必须经过审核</div>
                </div>
                <FormField
                  control={form.control}
                  name="requiresCommentApproval"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dailyCommentLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">游客每日评论限制</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="每日评论数量限制"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      建议设置为较低值（如5-10条）
                    </FormDescription>
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <div className="font-medium text-sm">图片评论</div>
                  <div className="text-xs text-gray-600">允许在评论中添加图片</div>
                </div>
                <FormField
                  control={form.control}
                  name="canCommentWithImages"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 评论基础权限 */}
        <FormField
          control={form.control}
          name="canComment"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  评论权限
                </FormLabel>
                <FormDescription>
                  允许用户发表评论
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
          name="requiresCommentApproval"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  需要审核
                </FormLabel>
                <FormDescription>
                  评论发布后需要管理员审核
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
          name="canCommentWithImages"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  图片评论
                </FormLabel>
                <FormDescription>
                  允许在评论中添加图片
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
          name="dailyCommentLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>每日评论限制</FormLabel>
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
                -1 表示无限制，0 表示禁止评论
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
