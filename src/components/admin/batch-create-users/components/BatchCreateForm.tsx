/**
 * @fileoverview 批量创建表单组件
 * @description 批量创建用户的表单配置组件
 */

"use client";

import { UseFormReturn } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, AlertCircle } from "lucide-react";
import {
  type BatchCreateFormData,
  type ParsedUserData,
  USER_LEVEL_OPTIONS,
  CSV_TEMPLATE
} from "../types/batch-create-types";
import { useCsvTemplate } from "../hooks/use-csv-parser";

interface BatchCreateFormProps {
  form: UseFormReturn<BatchCreateFormData>;
  onPreview: (data: BatchCreateFormData) => void;
  parsedUsers: ParsedUserData[];
  parseErrors: string[];
  isPending?: boolean;
}

/**
 * 批量创建表单组件
 */
export function BatchCreateForm({
  form,
  onPreview,
  parsedUsers,
  parseErrors,
  isPending = false
}: BatchCreateFormProps) {
  const { downloadTemplate } = useCsvTemplate();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onPreview)} className="space-y-6">
        {/* 错误提示 */}
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        {/* 模板下载 */}
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-blue-900 mb-1">CSV模板</h4>
              <p className="text-sm text-blue-700 mb-3">
                下载CSV模板文件，按照格式填写用户数据后粘贴到下方文本框中。
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadTemplate(true)}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Download className="w-4 h-4 mr-2" />
                下载模板
              </Button>
            </div>
          </div>
        </div>

        {/* CSV数据输入 */}
        <FormField
          control={form.control}
          name="csvData"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CSV数据</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={CSV_TEMPLATE}
                  className="min-h-[200px] font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                粘贴CSV格式的用户数据。第一行为标题行，支持的字段：username（必需）、email、password、displayName、bio、userLevel、isVerified、canPublish
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 默认配置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="defaultUserLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>默认用户等级</FormLabel>
                <Select onValueChange={(value: string) => field.onChange(value)} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择默认用户等级" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {USER_LEVEL_OPTIONS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-gray-500">{level.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  当CSV中未指定用户等级时使用的默认值
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="defaultIsVerified"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>默认已验证状态</FormLabel>
                    <FormDescription>
                      当CSV中未指定验证状态时的默认值
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultCanPublish"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>默认发布权限</FormLabel>
                    <FormDescription>
                      当CSV中未指定发布权限时的默认值
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* 其他选项 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="generateRandomPassword"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>自动生成密码</FormLabel>
                  <FormDescription>
                    为没有提供密码的用户自动生成随机密码
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sendWelcomeEmail"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>发送欢迎邮件</FormLabel>
                  <FormDescription>
                    向有邮箱的新用户发送欢迎邮件
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* 解析结果预览 */}
        {(parsedUsers.length > 0 || parseErrors.length > 0) && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium mb-2">解析结果</h4>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600">
                ✓ 有效用户: {parsedUsers.length}
              </span>
              {parseErrors.length > 0 && (
                <span className="text-red-600">
                  ✗ 错误: {parseErrors.length}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isPending ? '解析中...' : '解析数据'}
          </Button>
        </div>

        {/* 使用说明 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-800 mb-2">使用说明</h5>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• 支持最多50个用户同时创建</li>
            <li>• 用户名为必填字段，必须唯一且符合格式要求</li>
            <li>• 邮箱、密码等字段为可选，未填写时使用默认配置</li>
            <li>• 布尔值字段支持 true/false、1/0、yes/no 格式</li>
            <li>• 建议先下载模板文件，按格式填写后导入</li>
          </ul>
        </div>
      </form>
    </Form>
  );
}
