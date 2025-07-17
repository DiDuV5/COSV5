/**
 * @fileoverview 媒体文件管理Hook
 * @description 处理媒体文件上传、删除、排序等功能
 */

import type { MediaFile } from '@/components/upload/MediaPreview';
import { api } from '@/trpc/react';
import { useState } from 'react';

// 前端视频缩略图生成函数
const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法创建Canvas上下文'));
      return;
    }

    video.onloadedmetadata = () => {
      // 设置画布尺寸
      canvas.width = Math.min(video.videoWidth, 600);
      canvas.height = Math.min(video.videoHeight, 400);

      // 跳转到视频的1秒处或10%处（取较小值）
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        // 绘制视频帧到画布
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 转换为数据URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        // 清理资源
        video.src = '';
        URL.revokeObjectURL(video.src);

        resolve(dataUrl);
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => reject(new Error('视频加载失败'));

    // 设置视频源
    video.src = URL.createObjectURL(file);
    video.load();
  });
};

export function useMediaFiles() {
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);
  const [showMediaPreview, setShowMediaPreview] = useState(true);

  // 删除文件
  const deleteFileMutation = api.upload.deleteMedia.useMutation({
    onSuccess: (result: any, variables: any) => {
      console.log('文件删除成功:', variables.mediaId);
      // API删除成功后，更新前端状态
      setUploadedFiles(prev => prev.filter(file => file.id !== variables.mediaId));
    },
    onError: (error: any, variables: any) => {
      console.error('删除文件失败:', error);
      // 错误处理在调用方处理
      throw error;
    },
  });

  // 更新媒体文件顺序
  const updateMediaOrder = api.upload.updateMediaOrder.useMutation({
    onError: (error) => {
      console.error('更新媒体文件顺序失败:', error);
    },
  });

  // 获取媒体文件最新信息的工具函数
  const getMediaInfoQuery = api.media.getMediaInfo;

  // 处理文件上传完成
  const handleUploadComplete = async (files: any[], originalFiles?: File[]) => {
    console.log('🔍 原始上传结果:', files);

    const mediaFiles: MediaFile[] = await Promise.all(files.map(async (file, index) => {
      // 确保ID字段正确映射 - 支持多种ID字段格式
      const fileId = file.fileId || file.mediaId || file.id;

      if (!fileId) {
        console.error('❌ 文件缺少ID字段:', file);
        throw new Error(`上传的文件缺少有效的ID字段: ${file.filename || '未知文件'}`);
      }

      // 智能缩略图URL选择逻辑
      let thumbnailUrl = '';
      if (file.mediaType === 'VIDEO') {
        // 视频文件优先使用专门的缩略图URL
        thumbnailUrl = file.thumbnailUrl ||
                      file.thumbnails?.[0]?.url ||
                      file.thumbnails?.[0]?.cdnUrl ||
                      file.processedImages?.[0]?.url ||
                      file.processedImages?.[0]?.cdnUrl ||
                      file.url ||
                      file.cdnUrl || '';

        // 如果服务端没有生成缩略图，尝试前端生成
        if (!thumbnailUrl && originalFiles?.[index]) {
          try {
            console.log(`🖼️ 服务端缩略图缺失，尝试前端生成: ${file.filename}`);
            thumbnailUrl = await generateVideoThumbnail(originalFiles[index]);
            console.log(`✅ 前端缩略图生成成功: ${file.filename}`);
          } catch (error) {
            console.warn(`⚠️ 前端缩略图生成失败: ${file.filename}`, error);
            // 使用视频本身作为备用
            thumbnailUrl = file.url || file.cdnUrl || '';
          }
        }
      } else {
        // 图片文件可以直接使用原图或处理后的图片
        thumbnailUrl = file.processedImages?.[0]?.url ||
                      file.processedImages?.[0]?.cdnUrl ||
                      file.thumbnailUrl ||
                      file.url ||
                      file.cdnUrl || '';
      }

      const mediaFile: MediaFile = {
        id: fileId,
        filename: file.filename || `file_${index}`,
        originalName: file.originalFilename || file.originalName || file.filename || `file_${index}`,
        url: file.url || file.cdnUrl || '',
        thumbnailUrl: thumbnailUrl,
        mediaType: file.mediaType || 'IMAGE',
        width: file.width,
        height: file.height,
        duration: file.duration,
        fileSize: file.fileSize || 0,
        isDuplicate: file.isDuplicate || false,
        order: uploadedFiles.length + index,
        // 添加缩略图和处理后图片数组
        thumbnails: file.thumbnails,
        processedImages: file.processedImages,
      };

      console.log(`✅ 处理文件 ${index + 1}:`, {
        原始: { mediaId: file.mediaId, id: file.id, filename: file.filename },
        映射后: { id: mediaFile.id, filename: mediaFile.filename, url: mediaFile.url }
      });

      return mediaFile;
    }));

    console.log('📝 处理上传完成的文件:', mediaFiles);
    console.log('📊 文件ID列表:', mediaFiles.map(f => f.id));
    setUploadedFiles(prev => [...prev, ...mediaFiles]);

    // 自动刷新机制：对于图片文件，延迟10秒后自动刷新一次以获取WebP转换后的信息
    const imageFiles = mediaFiles.filter(file =>
      file.mediaType === 'IMAGE' && file.id
    );

    if (imageFiles.length > 0) {
      console.log(`⏰ 将在10秒后自动刷新${imageFiles.length}个图片文件的信息以获取WebP转换结果`);
      setTimeout(async () => {
        console.log('🔄 开始自动刷新图片文件信息...');
        for (const imageFile of imageFiles) {
          try {
            await refreshMediaInfo(imageFile.id);
          } catch (error) {
            console.warn(`⚠️ 自动刷新失败: ${imageFile.filename}`, error);
          }
        }
        console.log('✅ 自动刷新完成');
      }, 10000); // 10秒延迟
    }
  };

  // 处理文件删除
  const handleFileDelete = async (fileId: string) => {
    try {
      console.log('开始删除文件:', fileId);

      // 先调用API删除文件（包括数据库记录和物理文件）
      await deleteFileMutation.mutateAsync({ mediaId: fileId });

      // 如果API调用成功，前端状态已在onSuccess回调中更新
      console.log('文件删除完成:', fileId);
    } catch (error) {
      console.error('删除文件失败:', error);
      // 错误处理已在onError回调中处理
      // 这里不更新前端状态，保持文件在列表中
      throw error;
    }
  };

  // 刷新单个媒体文件信息
  const refreshMediaInfo = async (mediaId: string): Promise<void> => {
    try {
      console.log(`🔄 刷新媒体文件信息: ${mediaId}`);

      // 使用fetch直接调用API，使用正确的tRPC批量查询格式
      const tRPCInput = { "0": { "json": { mediaId } } };
      const response = await fetch(`/api/trpc/media.getMediaInfo?batch=1&input=${encodeURIComponent(JSON.stringify(tRPCInput))}`);
      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status}`);
      }

      const data = await response.json();
      // 批量查询返回数组格式，取第一个结果
      const updatedMedia = Array.isArray(data) ? data[0]?.result?.data?.json : data.result?.data;

      if (!updatedMedia) {
        throw new Error('API返回数据格式错误');
      }

      // 更新前端状态
      setUploadedFiles(prev => prev.map(file => {
        if (file.id === mediaId) {
          return {
            ...file,
            fileSize: updatedMedia.fileSize,
            filename: updatedMedia.filename,
            url: updatedMedia.url,
            // 如果有其他需要更新的字段也可以在这里添加
          };
        }
        return file;
      }));

      console.log(`✅ 媒体文件信息已刷新: ${mediaId}, 新大小: ${updatedMedia.fileSize}`);
    } catch (error) {
      console.error(`❌ 刷新媒体文件信息失败: ${mediaId}`, error);
    }
  };

  // 刷新所有媒体文件信息
  const refreshAllMediaInfo = async (): Promise<void> => {
    console.log('🔄 刷新所有媒体文件信息...');
    const refreshPromises = uploadedFiles
      .filter(file => file.id) // 只刷新有ID的文件
      .map(file => refreshMediaInfo(file.id));

    await Promise.allSettled(refreshPromises);
    console.log('✅ 所有媒体文件信息刷新完成');
  };

  // 处理文件重新排序
  const handleFileReorder = async (reorderedFiles: MediaFile[]) => {
    setUploadedFiles(reorderedFiles);

    // 如果文件已经关联到帖子，立即更新数据库中的顺序
    if (reorderedFiles.length > 0 && reorderedFiles[0].id) {
      try {
        const mediaUpdates = reorderedFiles.map((file, index) => ({
          id: file.id,
          order: index,
        }));

        await updateMediaOrder.mutateAsync({ mediaUpdates });
        console.log('媒体文件顺序已更新:', mediaUpdates);
      } catch (error) {
        console.error('更新媒体文件顺序失败:', error);
        // 这里可以添加错误提示，但不影响前端显示
      }
    }
  };

  return {
    uploadedFiles,
    setUploadedFiles,
    showMediaPreview,
    setShowMediaPreview,
    handleUploadComplete,
    handleFileDelete,
    handleFileReorder,
    refreshMediaInfo,
    refreshAllMediaInfo,
  };
}
