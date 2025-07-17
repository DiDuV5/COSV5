/**
 * @fileoverview 下载链接管理模态框（重构版）
 * @description 采用模块化架构的下载链接管理界面
 * @author Augment AI
 * @date 2025-06-29
 * @version 2.0.0 - 模块化重构
 * @since 1.0.0
 */

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Plus, Save, HelpCircle, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// 导入重构后的模块
import {
  DownloadLinkService,
  DownloadLinkForm,
  DownloadLinkStats,
  DownloadLinkSummary,
  type DownloadLink,
  type ValidationResult,
} from './index';

/**
 * 下载链接模态框属性接口
 */
export interface DownloadLinkModalProps {
  isOpen: boolean;
  postId?: string;
  initialLinks?: DownloadLink[];
  existingLinks?: { data: any[] };
  onClose: () => void;
  onSave?: (links: DownloadLink[]) => void;
}

/**
 * 下载链接管理模态框（重构版）
 */
export function DownloadLinkModal({
  isOpen,
  postId,
  initialLinks = [],
  existingLinks,
  onClose,
  onSave,
}: DownloadLinkModalProps) {
  // 状态管理
  const [links, setLinks] = useState<DownloadLink[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  // 获取tRPC utils用于缓存管理
  const utils = api.useUtils();

  // API mutations
  const saveLinks = api.downloadLink.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("资源下载保存成功", {
        description: `已保存资源下载链接`,
      });
      onSave?.([data]);
      onClose();
    },
    onError: (error: any) => {
      toast.error("保存失败", {
        description: error.message,
      });
    },
    onSettled: () => {
      setSaving(false);
    },
  });

  const deleteLink = api.downloadLink.delete.useMutation({
    onSuccess: () => {
      toast.success("链接删除成功");
    },
    onError: (error: any) => {
      toast.error("删除失败", {
        description: error.message,
      });
    },
  });

  // 初始化链接数据
  useEffect(() => {
    if (isOpen) {
      if (postId && existingLinks?.data && existingLinks.data.length > 0) {
        // 编辑模式：转换现有链接数据格式
        const formattedLinks = DownloadLinkService.formatExistingLinks(existingLinks.data);
        setLinks(formattedLinks);
      } else if (initialLinks.length > 0) {
        // 创建模式：使用初始链接数据
        setLinks(initialLinks);
      } else {
        // 默认：创建一个空链接
        setLinks([DownloadLinkService.createEmptyLink()]);
      }
      setErrors({});
    }
  }, [isOpen, existingLinks, initialLinks, postId]);

  // 计算统计数据
  const stats = useMemo(() => {
    return DownloadLinkService.calculateStats(links);
  }, [links]);

  // 验证结果
  const validationResult: ValidationResult = useMemo(() => {
    return DownloadLinkService.validateLinks(links);
  }, [links]);

  // 检查重复链接
  const duplicateCheck = useMemo(() => {
    return DownloadLinkService.checkDuplicateUrls(links);
  }, [links]);

  /**
   * 添加新链接
   */
  const handleAddLink = () => {
    const newLinks = DownloadLinkService.addNewLink(links);
    setLinks(newLinks);
  };

  /**
   * 删除链接
   */
  const handleRemoveLink = async (index: number) => {
    const link = links[index];

    if (link.id) {
      // 如果是已保存的链接，调用删除API
      try {
        await deleteLink.mutateAsync({ id: link.id });
        const newLinks = DownloadLinkService.removeLink(links, index);
        setLinks(newLinks);
      } catch (error) {
        console.error('删除链接失败:', error);
      }
    } else {
      // 如果是新链接，直接从数组中移除
      const newLinks = DownloadLinkService.removeLink(links, index);
      setLinks(newLinks);
    }
  };

  /**
   * 更新链接字段
   */
  const handleUpdateLinkField = (index: number, field: keyof DownloadLink, value: any) => {
    const updatedLinks = DownloadLinkService.updateLinkField(links, index, field, value);
    setLinks(updatedLinks);

    // 清除该行的错误
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  /**
   * 保存链接
   */
  const handleSaveLinks = async () => {
    // 验证链接数据
    const validation = DownloadLinkService.validateLinks(links);

    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error("请检查并修正错误", {
        description: "部分链接信息不完整或格式错误",
      });
      return;
    }

    // 检查重复链接
    if (duplicateCheck.hasDuplicates) {
      toast.error("发现重复的下载链接", {
        description: "请检查并删除重复的链接",
      });
      return;
    }

    setSaving(true);

    try {
      if (postId) {
        // 编辑模式：直接保存到数据库
        const savedLinks: any[] = [];
        for (const link of links) {
          if (!link.id) { // 只保存新链接
            console.log('💾 保存新下载链接:', link);
            const result = await saveLinks.mutateAsync({
              postId: postId,
              platform: link.platform,
              url: link.url ? link.url.trim() : '',
              extractCode: link.extractCode?.trim() || '',
              cansPrice: link.cansPrice,
              title: link.title ? link.title.trim() : '',
              description: link.description?.trim() || '',
              sortOrder: link.sortOrder,
            });
            savedLinks.push(result);
          }
        }

        // 保存成功后，立即刷新下载链接缓存
        if (savedLinks.length > 0) {
          console.log('🔄 刷新下载链接缓存...');
          await utils.downloadLink.getByPostId.invalidate({ postId });
        }

        toast.success("资源下载保存成功", {
          description: `已保存${savedLinks.length}个新的下载链接`,
        });

        // 通知父组件保存成功，传递空数组（因为类型不匹配）
        onSave?.([]);
        onClose();
      } else {
        // 创建模式：保存到本地状态，等内容发布后再保存到数据库
        const validLinks = links.filter(link =>
          link.platform && link.url && link.title
        );

        toast.success("资源下载已暂存", {
          description: `已暂存${validLinks.length}个资源下载链接，发布内容后将自动保存`,
        });

        onSave?.(validLinks);
        onClose();
        setSaving(false);
        return;
      }
    } catch (error) {
      console.error('❌ 保存链接失败:', error);
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "保存下载链接时发生错误，请稍后重试",
      });
      setSaving(false);
    }
  };

  // 如果模态框未打开，不渲染
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">
              {postId ? '编辑资源下载' : '添加资源下载'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              为您的内容添加资源下载链接，支持多种网盘平台
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* 统计信息 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DownloadLinkSummary links={links} stats={stats} />
              </div>
              <div>
                <DownloadLinkStats
                  links={links}
                  stats={stats}
                  showDetails={false}
                />
              </div>
            </div>

            {/* 错误提示 */}
            {!validationResult.isValid && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        发现 {Object.keys(validationResult.errors).length} 个错误
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        请检查并修正标记为红色的链接
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 重复链接警告 */}
            {duplicateCheck.hasDuplicates && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        发现重复的下载链接
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        链接 {duplicateCheck.duplicateIndices.map(i => i + 1).join(', ')} 存在重复的URL
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 链接表单列表 */}
            <div className="space-y-4">
              {links.map((link, index) => (
                <DownloadLinkForm
                  key={index}
                  link={link}
                  index={index}
                  error={errors[index]}
                  showRemoveButton={links.length > 1}
                  onUpdate={(field, value) => handleUpdateLinkField(index, field, value)}
                  onRemove={() => handleRemoveLink(index)}
                />
              ))}

              {/* 添加链接按钮 */}
              <Button
                variant="outline"
                onClick={handleAddLink}
                className="w-full py-6 border-dashed border-2 hover:border-blue-500 hover:text-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加资源下载
              </Button>
            </div>

            {/* 使用说明 */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-2">使用说明：</p>
                    <ul className="space-y-1 text-xs">
                      <li>• 支持多种主流网盘平台，选择对应平台会自动识别链接格式</li>
                      <li>• 设置罐头价格为0表示免费获取，用户无需消费罐头</li>
                      <li>• 已保存的链接无法修改URL和提取码，确保安全性</li>
                      <li>• 用户兑换后，罐头会自动转入您的账户</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {DownloadLinkService.generateSummary(links)}
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                取消
              </Button>
              <Button
                onClick={handleSaveLinks}
                disabled={saving || links.length === 0 || !validationResult.isValid}
                className="min-w-[100px]"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    保存中...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    保存 ({links.length})
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 导出类型
 */
export type {
  DownloadLink,
  ValidationResult,
} from './index';
