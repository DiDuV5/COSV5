/**
 * @fileoverview 导入导出功能组件
 * @description 处理权限配置的导入和导出操作
 */

"use client";

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileDown,
  Upload,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export interface ImportExportActionsProps {
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<void>;
  isPending?: boolean;
}

/**
 * 导入导出功能组件
 */
export function ImportExportActions({
  onExport,
  onImport,
  isPending = false,
}: ImportExportActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
      // 清空文件输入，允许重复选择同一文件
      event.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 导出配置 */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={isPending}>
            <FileDown className="w-4 h-4 mr-2" />
            导出配置
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导出权限配置</DialogTitle>
            <DialogDescription>
              将当前的媒体权限配置导出为JSON文件，可用于备份或在其他环境中导入。
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              导出的配置文件包含所有用户等级的权限设置，包括媒体访问比例、视频播放权限等。
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => {}}>
              取消
            </Button>
            <Button onClick={onExport} disabled={isPending}>
              <FileDown className="w-4 h-4 mr-2" />
              确认导出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入配置 */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={isPending}>
            <Upload className="w-4 h-4 mr-2" />
            导入配置
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入权限配置</DialogTitle>
            <DialogDescription>
              从JSON文件导入权限配置。导入后将覆盖当前的配置设置。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>注意：</strong>导入配置将覆盖当前所有权限设置。建议在导入前先导出当前配置作为备份。
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">选择配置文件</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleImportClick}
                  disabled={isPending}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  选择JSON文件
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                支持的文件格式：.json
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">文件要求</label>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 必须是有效的JSON格式</li>
                <li>• 包含configs数组字段</li>
                <li>• 每个配置项包含必要的权限字段</li>
                <li>• 用户等级必须是系统支持的类型</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {}}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
