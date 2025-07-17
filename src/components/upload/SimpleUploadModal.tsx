/**
 * @fileoverview 简单有效的上传模态框
 * @description 替代复杂的高级上传系统，专注于实际可用的功能
 * @author Augment AI
 * @date 2025-07-01
 * @version 1.0.0
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Upload, Image, Minus, Maximize2 } from 'lucide-react';
import { api, getUploadClient } from '@/trpc/react';

interface SimpleUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (files: any[]) => void;
  onUploadError?: (errors: Array<{ filename: string; error: string }>) => void;
  draggedFiles?: File[];
}

export function SimpleUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  onUploadError,
  draggedFiles = []
}: SimpleUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isMinimized, setIsMinimized] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [uploadErrors, setUploadErrors] = useState<Array<{ filename: string; error: string }>>([]);

  // 上传文件的 mutation - 使用专用上传客户端解决HTTP/2问题
  const uploadMutation = api.simpleUpload.upload.useMutation();

  // 处理文件选择
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // 支持图片和视频文件
    const supportedFiles = files.filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (supportedFiles.length < files.length) {
      alert(`已过滤 ${files.length - supportedFiles.length} 个不支持的文件。当前支持图片和视频上传。`);
    }

    setSelectedFiles(supportedFiles);
  }, []);

  // 处理拖拽文件
  useEffect(() => {
    if (draggedFiles.length > 0) {
      // 支持图片和视频文件
      const supportedFiles = draggedFiles.filter(file =>
        file.type.startsWith('image/') || file.type.startsWith('video/')
      );

      if (supportedFiles.length < draggedFiles.length) {
        alert(`已过滤 ${draggedFiles.length - supportedFiles.length} 个不支持的文件。当前支持图片和视频上传。`);
      }

      setSelectedFiles(supportedFiles);
    }
  }, [draggedFiles]);

  // 开始上传 - 重写批量上传逻辑
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({});
    setUploadResults([]);
    setUploadErrors([]);

    const results: any[] = [];
    const errors: Array<{ filename: string; error: string }> = [];

    for (const file of selectedFiles) {
      try {
        console.log(`🚀 开始上传文件: ${file.name} (${file.type})`);
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // 检查文件大小 - 大于1000MB的文件不支持base64上传
        const MAX_BASE64_SIZE = 1000 * 1024 * 1024; // 1000MB (1GB)
        if (file.size > MAX_BASE64_SIZE) {
          throw new Error(`文件 ${file.name} 大小为 ${(file.size / 1024 / 1024).toFixed(1)}MB，超过1000MB限制。请使用高级上传功能或联系管理员。`);
        }

        // 转换文件为 base64
        const base64 = await fileToBase64(file);
        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

        // 使用专用上传客户端进行文件上传（解决HTTP/2协议问题）
        const uploadClient = getUploadClient();
        const result = await uploadClient.simpleUpload.upload.mutate({
          filename: file.name,
          fileData: base64,
          mimeType: file.type
        });

        // 上传成功
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        results.push(result);
        console.log(`✅ 文件上传成功: ${file.name}`, result);

        // 如果是视频文件，添加到转码队列
        if (file.type.startsWith('video/')) {
          console.log(`🎬 检测到视频文件，准备添加到转码队列: ${file.name}`);

          try {
            // 这里我们需要调用视频转码API
            // 由于我们的转码API可能还没有完全集成，先显示提示
            console.log(`📝 视频文件 ${file.name} 已上传，转码功能正在开发中...`);

            // TODO: 添加到转码队列
            // const transcodingJob = await api.videoTranscoding.addJob.mutateAsync({
            //   mediaId: result.id,
            //   inputPath: result.path,
            //   outputDir: `processed/${result.userId}/${result.id}`,
            //   filename: file.name,
            //   originalFilename: file.name,
            //   formats: ['720p', '1080p'],
            //   extractThumbnail: true,
            //   thumbnailCount: 3,
            //   priority: 5
            // });

          } catch (transcodingError) {
            console.error(`❌ 添加转码任务失败: ${file.name}`, transcodingError);
            // 转码失败不影响上传成功
          }
        }

      } catch (error) {
        console.error(`❌ 上传文件 ${file.name} 失败:`, error);
        setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
        errors.push({
          filename: file.name,
          error: error instanceof Error ? error.message : '上传失败'
        });
      }
    }

    // 所有文件处理完成后的统一处理
    setIsUploading(false);
    setUploadResults(results);
    setUploadErrors(errors);

    console.log(`📊 批量上传完成 - 成功: ${results.length}, 失败: ${errors.length}`);

    // 只有在有成功上传的文件时才调用 onUploadComplete
    if (results.length > 0) {
      console.log('🎉 调用 onUploadComplete，传递所有成功的文件:', results);
      onUploadComplete?.(results);
    }

    // 只有在有错误时才调用 onUploadError
    if (errors.length > 0) {
      console.log('⚠️ 调用 onUploadError，传递所有错误:', errors);
      onUploadError?.(errors);
    }

    // 如果所有文件都成功上传，自动关闭模态框
    if (results.length === selectedFiles.length) {
      console.log('🎊 所有文件上传成功，关闭模态框');
      handleClose();
    }
  };

  // 文件转 base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // 移除 data:image/jpeg;base64, 前缀
      };
      reader.onerror = reject;
    });
  };

  // 处理关闭
  const handleClose = () => {
    if (isUploading) {
      const confirmed = window.confirm('正在上传文件，确定要关闭吗？');
      if (!confirmed) return;
    }

    // 重置所有状态
    setSelectedFiles([]);
    setUploadProgress({});
    setUploadResults([]);
    setUploadErrors([]);
    setIsUploading(false);
    setIsMinimized(false);
    onClose();
  };

  // 处理最小化
  const handleMinimize = () => {
    if (isUploading) {
      setIsMinimized(true);
    }
  };

  // 移除文件
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 获取进度百分比
  const getOverallProgress = () => {
    if (selectedFiles.length === 0) return 0;
    const total = selectedFiles.reduce((sum, file) => {
      const progress = uploadProgress[file.name] || 0;
      return sum + Math.max(0, progress);
    }, 0);
    return Math.round(total / selectedFiles.length);
  };

  // 如果最小化，显示小窗口
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">上传中...</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setIsMinimized(false)}>
              <Maximize2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getOverallProgress()}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {getOverallProgress()}% - {selectedFiles.length} 个文件
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" />
                媒体文件上传
              </DialogTitle>
              <DialogDescription>
                选择图片或视频文件进行上传（支持 JPG、PNG、GIF、MP4、AVI、MOV 等格式）
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1">
              {isUploading && (
                <Button variant="ghost" size="sm" onClick={handleMinimize}>
                  <Minus className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* 文件选择区域 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                点击选择文件或拖拽到此处
              </p>
              <p className="text-sm text-gray-500 mb-1">
                支持图片（JPG、PNG、GIF）和视频（MP4、AVI、MOV）格式
              </p>
              <p className="text-xs text-orange-600">
                ⚠️ 单文件大小限制1000MB以内
              </p>
            </label>
          </div>

          {/* 已选择的文件列表 */}
          {selectedFiles.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                已选择 {selectedFiles.length} 个文件
              </h3>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => {
                  const progress = uploadProgress[file.name] || 0;
                  const isError = progress === -1;
                  const isComplete = progress === 100;

                  return (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Image className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {isUploading && (
                          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                            <div
                              className={`h-1 rounded-full transition-all duration-300 ${
                                isError ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.max(0, progress)}%` }}
                            />
                          </div>
                        )}
                      </div>
                      {!isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作区域 */}
        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {selectedFiles.length > 0 && (
                <span>共 {selectedFiles.length} 个文件</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                取消
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
              >
                {isUploading ? '上传中...' : '开始上传'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
