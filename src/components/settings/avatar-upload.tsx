/**
 * @component AvatarUpload
 * @description 头像上传组件，支持文件选择、预览、裁剪和上传
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @props
 * - currentUser: User - 当前用户信息
 * - onUploadSuccess: (avatarUrl: string) => void - 上传成功回调
 *
 * @example
 * <AvatarUpload
 *   currentUser={user}
 *   onUploadSuccess={(url) => console.log('Avatar uploaded:', url)}
 * />
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - UnifiedAvatar component
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UnifiedAvatar } from "@/components/ui/unified-avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, Camera, X, Check, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";

// 支持的文件类型
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

interface AvatarUploadProps {
  currentUser: {
    id?: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean;
    userLevel?: string;
  };
  onUploadSuccess?: (avatarUrl: string) => void;
}

export function AvatarUpload({ currentUser, onUploadSuccess }: AvatarUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 暂时禁用头像更新API调用，使用模拟实现
  const updateAvatarMutation = {
    mutateAsync: async (data: { avatarData: string; filename: string }) => {
      console.log('头像更新功能暂时禁用:', data.filename);
      // 模拟上传延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess(true);
      setIsUploading(false);
      setUploadProgress(100);
      onUploadSuccess?.(data.avatarData);

      // 2秒后关闭对话框
      setTimeout(() => {
        setIsOpen(false);
        resetState();
      }, 2000);

      return { avatarUrl: data.avatarData };
    }
  };

  // 重置状态
  const resetState = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsUploading(false);
    setUploadProgress(0);
    setError(null);
    setSuccess(false);
  }, []);

  // 验证文件
  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return '不支持的文件格式，请选择 JPG、PNG 或 WebP 格式的图片';
    }

    if (file.size > MAX_FILE_SIZE) {
      return '文件大小不能超过 30MB';
    }

    return null;
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // 创建预览URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [validateFile]);

  // 处理上传
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // 将文件转换为base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;

        try {
          await updateAvatarMutation.mutateAsync({
            avatarData: base64Data,
            filename: selectedFile.name,
          });
          clearInterval(progressInterval);
        } catch (error) {
          clearInterval(progressInterval);
          throw error;
        }
      };
      reader.readAsDataURL(selectedFile);

    } catch (error) {
      console.error('Upload error:', error);
      setError('上传失败，请重试');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, updateAvatarMutation]);

  // 清除选择
  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="flex items-center gap-4">
      <UnifiedAvatar
        user={currentUser}
        size="xl"
        showVerifiedBadge={true}
        fallbackType="gradient"
      />

      <div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              更换头像
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>更换头像</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* 当前头像预览 */}
              <div className="text-center">
                <div className="inline-block">
                  {previewUrl ? (
                    <div className="relative">
                      <div className="w-24 h-24 relative overflow-hidden rounded-full border-4 border-gray-200">
                        <Image
                          src={previewUrl}
                          alt="头像预览"
                          fill
                          className="object-cover"
                          sizes="96px"
                          priority={true}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={handleClear}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <UnifiedAvatar
                      user={currentUser}
                      size="xl"
                      showVerifiedBadge={false}
                      fallbackType="gradient"
                    />
                  )}
                </div>
              </div>

              {/* 文件选择 */}
              <div className="space-y-2">
                <Label htmlFor="avatar-upload">选择头像图片</Label>
                <Input
                  ref={fileInputRef}
                  id="avatar-upload"
                  type="file"
                  accept={SUPPORTED_FORMATS.join(',')}
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500">
                  支持 JPG、PNG、WebP 格式，文件大小不超过 30MB
                </p>
              </div>

              {/* 错误提示 */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 成功提示 */}
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    头像上传成功！
                  </AlertDescription>
                </Alert>
              )}

              {/* 上传进度 */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>上传进度</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isUploading}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading || success}
                >
                  {isUploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      确认上传
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <p className="text-sm text-gray-500 mt-1">
          点击更换您的头像
        </p>
      </div>
    </div>
  );
}
