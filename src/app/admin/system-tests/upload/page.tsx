/**
 * @fileoverview 文件上传测试页面
 * @description 用于测试文件上传功能的页面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - React 18+
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 移动到admin/system-tests目录
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FileUploader, UploadedFile } from '@/components/upload/FileUploader';
import { MediaPreview, MediaFile } from '@/components/upload/MediaPreview';
import { OptimizedVideo } from '@/components/media/OptimizedVideo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Image as ImageIcon, Video, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TestUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Array<{ filename: string; error: string }>>([]);

  // 处理文件上传完成
  const handleUploadComplete = (files: UploadedFile[]) => {
    console.log('上传完成:', files);

    const mediaFiles: MediaFile[] = files.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.originalName,
      url: file.url,
      thumbnailUrl: file.thumbnailUrl,
      mediaType: file.mediaType,
      width: file.width,
      height: file.height,
      duration: file.duration,
      fileSize: file.fileSize,
      isDuplicate: file.isDuplicate,
      order: uploadedFiles.length,
    }));

    setUploadedFiles(prev => [...prev, ...mediaFiles]);
  };

  // 处理上传错误
  const handleUploadError = (errors: Array<{ filename: string; error: string }>) => {
    console.error('上传错误:', errors);
    setUploadErrors(errors);
  };

  // 处理文件删除
  const handleFileDelete = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
  };

  // 处理文件重新排序
  const handleFileReorder = (reorderedFiles: MediaFile[]) => {
    setUploadedFiles(reorderedFiles);
  };

  // 处理文件预览
  const handleFilePreview = (file: MediaFile) => {
    setSelectedFile(file);
  };

  // 清空所有文件
  const clearAllFiles = () => {
    setUploadedFiles([]);
    setSelectedFile(null);
    setUploadErrors([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 返回按钮和页面标题 */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/system-tests">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回测试中心
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">文件上传测试</h1>
        <p className="text-gray-600 mt-2">测试文件上传、预览和管理功能</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：上传和文件列表 */}
        <div className="space-y-6">
          {/* 文件上传器 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                文件上传
              </CardTitle>
              <CardDescription>
                支持图片和视频文件，拖拽或点击上传
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                maxFiles={10}
                maxFileSize={5000 * 1024 * 1024} // 5GB - 与管理后台一致
              />
            </CardContent>
          </Card>

          {/* 上传错误显示 */}
          {uploadErrors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">上传错误</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uploadErrors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600">
                      <strong>{error.filename}:</strong> {error.error}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 已上传文件列表 */}
          {uploadedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    已上传文件 ({uploadedFiles.length})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFiles}
                  >
                    清空所有
                  </Button>
                </div>
                <CardDescription>
                  点击文件预览，拖拽调整顺序
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MediaPreview
                  files={uploadedFiles}
                  onDelete={handleFileDelete}
                  onReorder={handleFileReorder}
                  onPreview={handleFilePreview}
                  editable={true}
                  maxHeight={400}
                />
              </CardContent>
            </Card>
          )}

          {/* 统计信息 */}
          {uploadedFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>统计信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {uploadedFiles.filter(f => f.mediaType === 'IMAGE').length}
                    </div>
                    <div className="text-sm text-gray-600">图片</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {uploadedFiles.filter(f => f.mediaType === 'VIDEO').length}
                    </div>
                    <div className="text-sm text-gray-600">视频</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {uploadedFiles.filter(f => f.isDuplicate).length}
                    </div>
                    <div className="text-sm text-gray-600">重复文件</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：文件预览 */}
        <div className="space-y-6">
          {selectedFile ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {selectedFile.mediaType === 'VIDEO' ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                  文件预览
                  {selectedFile.isDuplicate && (
                    <Badge variant="outline" className="ml-2">
                      重复文件
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedFile.originalName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 媒体预览 */}
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {selectedFile.mediaType === 'VIDEO' ? (
                      <OptimizedVideo
                        src={selectedFile.url}
                        poster={selectedFile.thumbnailUrl}
                        width={selectedFile.width}
                        height={selectedFile.height}
                        controls={true}
                        className="w-full h-full"
                        onLoadedMetadata={(metadata) => {
                          console.log('测试视频元数据:', metadata);
                        }}
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <Image
                          src={selectedFile.url}
                          alt={selectedFile.originalName}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority={true}
                        />
                      </div>
                    )}
                  </div>

                  {/* 文件信息 */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">文件名:</span>
                      <div className="text-gray-600 break-all">
                        {selectedFile.filename}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">原始名称:</span>
                      <div className="text-gray-600 break-all">
                        {selectedFile.originalName}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">文件大小:</span>
                      <div className="text-gray-600">
                        {(selectedFile.fileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">媒体类型:</span>
                      <div className="text-gray-600">
                        {selectedFile.mediaType}
                      </div>
                    </div>
                    {selectedFile.width && selectedFile.height && (
                      <div>
                        <span className="font-medium">尺寸:</span>
                        <div className="text-gray-600">
                          {selectedFile.width} × {selectedFile.height}
                        </div>
                      </div>
                    )}
                    {selectedFile.duration && (
                      <div>
                        <span className="font-medium">时长:</span>
                        <div className="text-gray-600">
                          {Math.floor(selectedFile.duration / 60)}:
                          {(selectedFile.duration % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedFile.url, '_blank')}
                    >
                      在新窗口打开
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFileDelete(selectedFile.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      删除文件
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  选择文件预览
                </h3>
                <p className="text-gray-500">
                  点击左侧的文件来查看详细信息和预览
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
