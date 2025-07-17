/**
 * @fileoverview 通知偏好设置组件
 * @description 用户通知偏好设置界面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "../ui/use-toast";
import { api } from "@/trpc/react";
import {
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Settings,
  Smartphone,
  Volume2,
  VolumeX,
  Loader2,
  TestTube
} from "lucide-react";
import { NotificationType, NotificationChannel } from "@/types/notification-types";

interface NotificationPreferencesProps {
  className?: string;
}

export function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const { toast } = useToast();
  const [isPending, setIsLoading] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  // 获取通知偏好设置
  const { data: preferencesData, refetch } = api.notification.getPreferences.useQuery();
  const { data: configsData } = api.notification.getTypeConfigs.useQuery();

  // 更新偏好设置
  const updatePreferences = api.notification.updatePreferences.useMutation({
    onSuccess: () => {
      toast({
        title: "设置已保存",
        description: "通知偏好设置已成功更新",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "保存失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 测试通知渠道
  const testNotificationChannel = api.notification.testNotificationChannel.useMutation({
    onSuccess: (data) => {
      toast({
        title: "测试成功",
        description: data.message,
      });
      setTestingChannel(null);
    },
    onError: (error) => {
      toast({
        title: "测试失败",
        description: error.message,
        variant: "destructive",
      });
      setTestingChannel(null);
    },
  });

  // 处理测试通知
  const handleTestNotification = async (channel: 'email') => {
    setTestingChannel(channel);
    await testNotificationChannel.mutateAsync({ channel });
  };

  const preferences = preferencesData?.preferences || [];
  const configs = configsData?.configs || [];

  // 处理偏好设置更新
  const handlePreferenceChange = async (
    notificationType: NotificationType,
    field: string,
    value: boolean | string | number
  ) => {


    // 如果是尝试开启邮箱通知，先检查是否已验证邮箱
    if (field === 'enableEmail' && value === true) {
      const userConfig = configsData?.userInfo;
      if (!userConfig?.email || !userConfig?.isVerified) {
        toast({
          title: "需要验证邮箱",
          description: "请先在账户设置中验证邮箱地址，然后再开启邮箱通知",
          variant: "destructive",
        });
        return;
      }
    }

    const updatedPreferences = preferences.map((pref: any) =>
      pref.notificationType === notificationType
        ? { ...pref, [field]: value }
        : pref
    );

    setIsLoading(true);
    try {
      await updatePreferences.mutateAsync({
        preferences: updatedPreferences,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 批量更新渠道设置
  const handleBulkChannelUpdate = async (channel: string, enabled: boolean) => {


    // 如果是尝试开启邮箱通知，先检查是否已验证邮箱
    if (channel === 'enableEmail' && enabled === true) {
      const userConfig = configsData?.userInfo;
      if (!userConfig?.email || !userConfig?.isVerified) {
        toast({
          title: "需要验证邮箱",
          description: "请先在账户设置中验证邮箱地址，然后再开启邮箱通知",
          variant: "destructive",
        });
        return;
      }
    }

    const updatedPreferences = preferences.map((pref: any) => ({
      ...pref,
      [channel]: enabled,
    }));

    setIsLoading(true);
    try {
      await updatePreferences.mutateAsync({
        preferences: updatedPreferences,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 获取渠道图标
  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case NotificationChannel.IN_APP:
        return <Bell className="h-4 w-4" />;

      case NotificationChannel.EMAIL:
        return <Mail className="h-4 w-4" />;
      case NotificationChannel.PUSH:
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // 获取渠道名称
  const getChannelName = (channel: NotificationChannel) => {
    switch (channel) {
      case NotificationChannel.IN_APP:
        return "站内通知";

      case NotificationChannel.EMAIL:
        return "邮箱";
      case NotificationChannel.PUSH:
        return "推送";
      default:
        return channel;
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "IMPORTANT":
        return "bg-orange-100 text-orange-800";
      case "NORMAL":
        return "bg-blue-100 text-blue-800";
      case "LOW":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // 获取优先级名称
  const getPriorityName = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "紧急";
      case "IMPORTANT":
        return "重要";
      case "NORMAL":
        return "普通";
      case "LOW":
        return "提醒";
      default:
        return priority;
    }
  };

  if (!preferencesData || !configsData) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <Settings className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">加载设置中...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 全局渠道控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            通知渠道总开关
          </CardTitle>
          <CardDescription>
            快速开启或关闭所有通知类型的特定渠道
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: 'enableInApp', channel: NotificationChannel.IN_APP },

              { key: 'enableEmail', channel: NotificationChannel.EMAIL },
              { key: 'enablePush', channel: NotificationChannel.PUSH },
            ].map(({ key, channel }) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getChannelIcon(channel)}
                  <span className="text-sm font-medium">{getChannelName(channel)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* 测试按钮 */}
                  {channel === NotificationChannel.EMAIL && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestNotification('email')}
                      disabled={
                        isPending ||
                        testingChannel === 'email' ||
                        !preferences.some((p: any) => p[key as keyof typeof p]) ||
                        (channel === NotificationChannel.EMAIL && (!configsData?.userInfo?.email || !configsData?.userInfo?.isVerified))
                      }
                      className="h-8 px-2"
                    >
                      {testingChannel === 'email' ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          测试中
                        </>
                      ) : (
                        <>
                          <TestTube className="h-3 w-3 mr-1" />
                          测试
                        </>
                      )}
                    </Button>
                  )}
                  <Switch
                    checked={preferences.some((p: any) => p[key as keyof typeof p])}
                    onCheckedChange={(checked) => handleBulkChannelUpdate(key, checked)}
                    disabled={isPending}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 详细通知设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            详细通知设置
          </CardTitle>
          <CardDescription>
            为每种通知类型单独配置接收渠道和设置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configs.map((config, index) => {
            const preference = preferences.find((p: any) => p.notificationType === config.type) || {
              notificationType: config.type,
              enableInApp: true,

              enableEmail: false,
              enablePush: false,
              quietHoursStart: null,
              quietHoursEnd: null,
              quietHoursEnabled: false,
              batchEnabled: true,
              batchInterval: 60,
            };

            return (
              <div key={config.type}>
                {index > 0 && <Separator className="my-6" />}

                <div className="space-y-4">
                  {/* 通知类型标题 */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium">{config.name}</h3>
                        <Badge className={getPriorityColor(config.priority)}>
                          {getPriorityName(config.priority)}
                        </Badge>
                        {!config.isUserConfigurable && (
                          <Badge variant="outline">系统必需</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                  </div>

                  {/* 渠道设置 */}
                  {config.isUserConfigurable && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {config.availableChannels.map((channel) => {
                        const channelKey = `enable${channel.charAt(0).toUpperCase() + channel.slice(1).toLowerCase()}` as keyof typeof preference;

                        return (
                          <div key={channel} className="flex items-center space-x-2">
                            <Switch
                              id={`${config.type}-${channel}`}
                              checked={Boolean(preference[channelKey])}
                              onCheckedChange={(checked) =>
                                handlePreferenceChange(config.type as NotificationType, channelKey as string, checked)
                              }
                              disabled={isPending}
                            />
                            <Label
                              htmlFor={`${config.type}-${channel}`}
                              className="flex items-center gap-1 text-sm"
                            >
                              {getChannelIcon(channel as NotificationChannel)}
                              {getChannelName(channel as NotificationChannel)}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 高级设置 */}
                  {config.isUserConfigurable && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* 免打扰时间 */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`${config.type}-quiet`}
                            checked={preference.quietHoursEnabled}
                            onCheckedChange={(checked) =>
                              handlePreferenceChange(config.type as NotificationType, 'quietHoursEnabled', checked)
                            }
                            disabled={isPending}
                          />
                          <Label htmlFor={`${config.type}-quiet`} className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            免打扰时间
                          </Label>
                        </div>
                        {preference.quietHoursEnabled && (
                          <div className="flex items-center space-x-2 ml-6">
                            <Input
                              type="time"
                              value={preference.quietHoursStart || "22:00"}
                              onChange={(e) =>
                                handlePreferenceChange(config.type as NotificationType, 'quietHoursStart', e.target.value)
                              }
                              className="w-24"
                              disabled={isPending}
                            />
                            <span className="text-sm text-muted-foreground">至</span>
                            <Input
                              type="time"
                              value={preference.quietHoursEnd || "08:00"}
                              onChange={(e) =>
                                handlePreferenceChange(config.type as NotificationType, 'quietHoursEnd', e.target.value)
                              }
                              className="w-24"
                              disabled={isPending}
                            />
                          </div>
                        )}
                      </div>

                      {/* 批量发送设置 */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`${config.type}-batch`}
                            checked={preference.batchEnabled}
                            onCheckedChange={(checked) =>
                              handlePreferenceChange(config.type as NotificationType, 'batchEnabled', checked)
                            }
                            disabled={isPending}
                          />
                          <Label htmlFor={`${config.type}-batch`} className="flex items-center gap-1">
                            <VolumeX className="h-4 w-4" />
                            批量发送
                          </Label>
                        </div>
                        {preference.batchEnabled && (
                          <div className="flex items-center space-x-2 ml-6">
                            <Input
                              type="number"
                              min="1"
                              max="1440"
                              value={preference.batchInterval || 60}
                              onChange={(e) =>
                                handlePreferenceChange(config.type as NotificationType, 'batchInterval', parseInt(e.target.value))
                              }
                              className="w-20"
                              disabled={isPending}
                            />
                            <span className="text-sm text-muted-foreground">分钟</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button
          onClick={() => refetch()}
          disabled={isPending}
          variant="outline"
        >
          {isPending ? "保存中..." : "刷新设置"}
        </Button>
      </div>
    </div>
  );
}
