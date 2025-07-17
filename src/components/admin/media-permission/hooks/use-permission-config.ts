/**
 * @fileoverview 权限配置表单Hook
 * @description 管理媒体权限配置的表单状态和操作
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/trpc/react';
import { useToast } from '@/hooks/use-toast';
import {
  MediaPermissionForm,
  MediaPermissionFormSchema,
  type PermissionOverview,
  getUserLevelConfig,
  getDefaultPermissionConfig,
  USER_LEVEL_CONFIGS,
} from '../constants/user-level-configs';

export interface UsePermissionConfigProps {
  onSaveSuccess?: () => void;
  onSaveError?: (error: any) => void;
}

export interface UsePermissionConfigReturn {
  // 表单相关
  form: ReturnType<typeof useForm<MediaPermissionForm>>;
  isSaving: boolean;
  
  // 数据相关
  permissionOverview: {
    configs: any[];
    userStats: Record<string, number>;
  } | undefined;
  isPending: boolean;
  error: any;
  
  // 操作方法
  handleSave: (data: MediaPermissionForm) => Promise<void>;
  handleResetDefaults: () => void;
  handleExport: () => Promise<void>;
  handleImport: (file: File) => Promise<void>;
  refetch: () => void;
}

/**
 * 权限配置表单Hook
 */
export function usePermissionConfig({
  onSaveSuccess,
  onSaveError,
}: UsePermissionConfigProps = {}): UsePermissionConfigReturn {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // 获取权限概览数据
  const {
    data: permissionOverview,
    isPending,
    error,
    refetch,
  } = api.permission.getMediaPermissionOverview.useQuery(
    undefined,
    {
      staleTime: 30000, // 30秒缓存
    }
  );

  // 初始化表单
  const form = useForm<MediaPermissionForm>({
    resolver: zodResolver(MediaPermissionFormSchema),
    defaultValues: {
      configs: USER_LEVEL_CONFIGS.map(config => getDefaultPermissionConfig(config.value)),
      reason: '',
    },
  });

  // 当权限概览数据加载完成时，初始化表单
  useEffect(() => {
    if (permissionOverview) {
      console.log('🔍 权限概览数据结构:', permissionOverview);
      console.log('🔍 configs:', permissionOverview.configs);
      console.log('🔍 userStats:', permissionOverview.userStats);

      if (permissionOverview.configs) {
        const configs = USER_LEVEL_CONFIGS.map(levelConfig => {
          const existing = permissionOverview.configs.find((p: any) => p.userLevel === levelConfig.value);
          return {
            userLevel: levelConfig.value,
            mediaAccessPercentage: existing?.mediaAccessPercentage ?? levelConfig.defaultMediaAccess,
            canPlayVideos: existing?.canPlayVideos ?? true,
            canViewRestrictedPreview: existing?.canViewRestrictedPreview ?? (levelConfig.value !== 'GUEST'),
            canDownloadImages: existing?.canDownloadImages ?? (levelConfig.value !== 'GUEST'),
          };
        });

        form.reset({ configs, reason: '' });
        console.log('表单初始化完成:', configs);
      }
    }
  }, [permissionOverview, form]);

  // 批量更新权限配置 mutation
  const batchUpdateMutation = api.permission.batchUpdateUserGroupPermissions.useMutation({
    onSuccess: (data: any) => {
      setIsSaving(false);
      toast({
        title: "保存成功",
        description: data.message || "媒体权限配置已更新",
      });

      // 刷新数据
      refetch();
      onSaveSuccess?.();
    },
    onError: (error: any) => {
      setIsSaving(false);
      console.error('保存权限配置失败:', error);
      
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error.message || "更新权限配置时出现错误",
      });
      
      onSaveError?.(error);
    },
  });

  // 保存配置
  const handleSave = async (data: MediaPermissionForm) => {
    setIsSaving(true);
    try {
      await batchUpdateMutation.mutateAsync({
        updates: data.configs,
        reason: data.reason,
      });
      
      // 成功后清空操作原因字段
      form.setValue('reason', '');
    } catch (error) {
      console.error('保存失败:', error);
      setIsSaving(false);
    }
  };

  // 重置为默认配置
  const handleResetDefaults = () => {
    const defaultConfigs = USER_LEVEL_CONFIGS.map(levelConfig => 
      getDefaultPermissionConfig(levelConfig.value)
    );
    
    form.setValue('configs', defaultConfigs);
    
    toast({
      title: "重置成功",
      description: "已重置为默认权限配置",
    });
  };

  // 导出配置
  const handleExport = async () => {
    try {
      const currentConfigs = form.getValues().configs;
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        configs: currentConfigs,
        metadata: {
          totalConfigs: currentConfigs.length,
          exportedBy: 'MediaPermissionConfig',
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media-permissions-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "导出成功",
        description: "权限配置已导出到文件",
      });
    } catch (error) {
      console.error('导出失败:', error);
      toast({
        variant: "destructive",
        title: "导出失败",
        description: "导出权限配置时出现错误",
      });
    }
  };

  // 导入配置
  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // 验证导入数据格式
      if (!importData.configs || !Array.isArray(importData.configs)) {
        throw new Error('无效的配置文件格式');
      }

      // 验证配置数据
      const validatedConfigs = MediaPermissionFormSchema.parse({
        configs: importData.configs,
        reason: '导入配置文件',
      });

      form.setValue('configs', validatedConfigs.configs);
      form.setValue('reason', '导入配置文件');

      toast({
        title: "导入成功",
        description: `已导入 ${validatedConfigs.configs.length} 个权限配置`,
      });
    } catch (error) {
      console.error('导入失败:', error);
      toast({
        variant: "destructive",
        title: "导入失败",
        description: error instanceof Error ? error.message : "导入配置文件时出现错误",
      });
    }
  };

  return {
    // 表单相关
    form,
    isSaving,
    
    // 数据相关
    permissionOverview,
    isPending,
    error,
    
    // 操作方法
    handleSave,
    handleResetDefaults,
    handleExport,
    handleImport,
    refetch,
  };
}
