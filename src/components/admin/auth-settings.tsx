/**
 * @fileoverview 认证设置组件
 * @description 管理用户认证相关的设置，包括登录方式、密码策略等
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/react-query: ^10.45.0
 * - react-hook-form: ^7.48.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle, Save, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthSettingsForm {
  enableEmailVerification: boolean;
  enableTelegramLogin: boolean;
  enableTelegramRegister: boolean;
  usernameMinLength: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  loginPageNotice: string;
  registerPageNotice: string;
}

export function AuthSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 获取当前设置
  const { data: settings, isPending, refetch } = api.settings.getAuthSettings.useQuery();

  // 更新设置的 mutation
  const updateSettings = api.settings.updateAuthSettings.useMutation({
    onSuccess: () => {
      setSaveMessage({ type: 'success', message: '认证设置已成功更新' });
      refetch();
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: (error) => {
      setSaveMessage({ type: 'error', message: error.message || '更新失败，请重试' });
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<AuthSettingsForm>({
    defaultValues: {
      enableEmailVerification: false,
      enableTelegramLogin: false,
      enableTelegramRegister: false,
      usernameMinLength: 6,
      passwordMinLength: 6,
      passwordRequireUppercase: false,
      passwordRequireLowercase: false,
      passwordRequireNumbers: false,
      passwordRequireSymbols: false,
      loginPageNotice: "当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员",
      registerPageNotice: "当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员",
      ...settings,
    },
  });

  // 监听表单变化
  const watchedValues = watch();

  // 当设置加载完成时更新表单默认值
  React.useEffect(() => {
    if (settings) {
      Object.entries(settings).forEach(([key, value]) => {
        // 确保数据类型正确
        let formattedValue = value;
        if (key === 'passwordMinLength' || key === 'usernameMinLength') {
          formattedValue = Number(value) || 6;
        } else if (typeof value === 'string' && (value === 'true' || value === 'false')) {
          formattedValue = value === 'true';
        }
        setValue(key as keyof AuthSettingsForm, formattedValue);
      });
    }
  }, [settings, setValue]);

  const onSubmit = async (data: AuthSettingsForm) => {
    setIsSaving(true);
    setSaveMessage(null);

    // 确保数据类型正确，并提供默认值
    const formattedData = {
      enableEmailVerification: data.enableEmailVerification ?? false,
      enableTelegramLogin: data.enableTelegramLogin ?? false,
      enableTelegramRegister: data.enableTelegramRegister ?? false,
      usernameMinLength: Number(data.usernameMinLength) || 6,
      passwordMinLength: Number(data.passwordMinLength) || 6,
      passwordRequireUppercase: data.passwordRequireUppercase ?? false,
      passwordRequireLowercase: data.passwordRequireLowercase ?? false,
      passwordRequireNumbers: data.passwordRequireNumbers ?? false,
      passwordRequireSymbols: data.passwordRequireSymbols ?? false,
      loginPageNotice: data.loginPageNotice || "当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员",
      registerPageNotice: data.registerPageNotice || "当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员",
    };

    await updateSettings.mutateAsync(formattedData);
  };

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 保存消息 */}
      {saveMessage && (
        <Alert className={saveMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          {saveMessage.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
            {saveMessage.message}
          </AlertDescription>
        </Alert>
      )}

      {/* 登录方式设置 */}
      <Card>
        <CardHeader>
          <CardTitle>登录方式</CardTitle>
          <CardDescription>
            配置用户可以使用的登录和注册方式
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableEmailVerification">邮箱验证</Label>
              <p className="text-sm text-gray-500">
                要求用户在注册时验证邮箱地址
              </p>
            </div>
            <Switch
              id="enableEmailVerification"
              checked={watchedValues.enableEmailVerification}
              onCheckedChange={(checked) => setValue('enableEmailVerification', checked, { shouldDirty: true })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableTelegramLogin">Telegram 登录</Label>
              <p className="text-sm text-gray-500">
                允许用户使用 Telegram 账号登录
              </p>
            </div>
            <Switch
              id="enableTelegramLogin"
              checked={watchedValues.enableTelegramLogin}
              onCheckedChange={(checked) => setValue('enableTelegramLogin', checked, { shouldDirty: true })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableTelegramRegister">Telegram 注册</Label>
              <p className="text-sm text-gray-500">
                允许用户使用 Telegram 账号直接注册
              </p>
            </div>
            <Switch
              id="enableTelegramRegister"
              checked={watchedValues.enableTelegramRegister}
              onCheckedChange={(checked) => setValue('enableTelegramRegister', checked, { shouldDirty: true })}
            />
          </div>
        </CardContent>
      </Card>

      {/* 用户名策略设置 */}
      <Card>
        <CardHeader>
          <CardTitle>用户名策略</CardTitle>
          <CardDescription>
            设置用户名的格式要求
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="usernameMinLength">用户名最小长度</Label>
              <Input
                id="usernameMinLength"
                type="number"
                min="3"
                max="20"
                {...register('usernameMinLength', {
                  required: '请输入用户名最小长度',
                  min: { value: 3, message: '最小长度不能少于3位' },
                  max: { value: 20, message: '最小长度不能超过20位' },
                  valueAsNumber: true, // 自动转换为数字
                })}
              />
              {errors.usernameMinLength && (
                <p className="text-sm text-red-600">{errors.usernameMinLength.message}</p>
              )}
              <p className="text-xs text-gray-500">
                用户名长度范围：3-20个字符，只能包含字母、数字、下划线和中文字符
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 密码策略设置 */}
      <Card>
        <CardHeader>
          <CardTitle>密码安全策略</CardTitle>
          <CardDescription>
            设置用户密码的强度要求
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">密码最小长度</Label>
              <Input
                id="passwordMinLength"
                type="number"
                min="6"
                max="32"
                {...register('passwordMinLength', {
                  required: '请输入密码最小长度',
                  min: { value: 6, message: '最小长度不能少于6位' },
                  max: { value: 32, message: '最小长度不能超过32位' },
                  valueAsNumber: true, // 自动转换为数字
                })}
              />
              {errors.passwordMinLength && (
                <p className="text-sm text-red-600">{errors.passwordMinLength.message}</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">密码必须包含</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="passwordRequireUppercase">大写字母 (A-Z)</Label>
                <Switch
                  id="passwordRequireUppercase"
                  checked={watchedValues.passwordRequireUppercase}
                  onCheckedChange={(checked) => setValue('passwordRequireUppercase', checked, { shouldDirty: true })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="passwordRequireLowercase">小写字母 (a-z)</Label>
                <Switch
                  id="passwordRequireLowercase"
                  checked={watchedValues.passwordRequireLowercase}
                  onCheckedChange={(checked) => setValue('passwordRequireLowercase', checked, { shouldDirty: true })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="passwordRequireNumbers">数字 (0-9)</Label>
                <Switch
                  id="passwordRequireNumbers"
                  checked={watchedValues.passwordRequireNumbers}
                  onCheckedChange={(checked) => setValue('passwordRequireNumbers', checked, { shouldDirty: true })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="passwordRequireSymbols">特殊字符 (!@#$...)</Label>
                <Switch
                  id="passwordRequireSymbols"
                  checked={watchedValues.passwordRequireSymbols}
                  onCheckedChange={(checked) => setValue('passwordRequireSymbols', checked, { shouldDirty: true })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 认证页面设置 */}
      <Card>
        <CardHeader>
          <CardTitle>认证页面设置</CardTitle>
          <CardDescription>
            配置登录和注册页面的说明文案
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginPageNotice">登录页面说明</Label>
              <textarea
                id="loginPageNotice"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                placeholder="请输入登录页面的说明文案..."
                {...register('loginPageNotice')}
              />
              <p className="text-sm text-gray-500">
                支持换行，将在登录页面以可折叠形式显示
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registerPageNotice">注册页面说明</Label>
              <textarea
                id="registerPageNotice"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                placeholder="请输入注册页面的说明文案..."
                {...register('registerPageNotice')}
              />
              <p className="text-sm text-gray-500">
                支持换行，将在注册页面以可折叠形式显示
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isSaving}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          重新加载
        </Button>

        <Button
          type="submit"
          disabled={!isDirty || isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存设置
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
