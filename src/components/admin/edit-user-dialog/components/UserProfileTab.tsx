/**
 * @fileoverview 用户资料标签页组件
 * @description 用户基本信息编辑表单
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { AlertCircle } from "lucide-react";
import type { UserProfileTabProps } from "../types";

export function UserProfileTab({
  user,
  editForm,
  isSubmitting,
  onSubmit,
  onClose,
}: UserProfileTabProps) {
  return (
    <Form {...editForm}>
      <form onSubmit={editForm.handleSubmit(onSubmit)} className="space-y-6">
        {/* 错误提示 */}
        {editForm.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {editForm.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 用户名 */}
          <FormField
            control={editForm.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>用户名</FormLabel>
                <FormControl>
                  <Input placeholder="输入用户名" {...field} />
                </FormControl>
                <FormDescription>
                  用户名用于登录和显示，只能包含字母、数字、下划线和中文字符
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 邮箱 */}
          <FormField
            control={editForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邮箱</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="输入邮箱地址" {...field} />
                </FormControl>
                <FormDescription>
                  用于接收通知和找回密码
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 显示名称 */}
          <FormField
            control={editForm.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>显示名称</FormLabel>
                <FormControl>
                  <Input placeholder="输入显示名称" {...field} />
                </FormControl>
                <FormDescription>
                  在页面上显示的名称，可以包含中文
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 头像URL */}
          <FormField
            control={editForm.control}
            name="avatarUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>头像URL</FormLabel>
                <FormControl>
                  <Input placeholder="输入头像图片URL" {...field} />
                </FormControl>
                <FormDescription>
                  用户头像的图片链接
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 个人简介 */}
        <FormField
          control={editForm.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>个人简介</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="输入个人简介"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                简单介绍一下自己，最多500个字符
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存资料"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
