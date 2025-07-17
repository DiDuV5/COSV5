/**
 * @fileoverview 拖拽上传功能Hook
 * @description 处理全局拖拽上传逻辑
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export function useDragUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const dragCounterRef = useRef(0);

  // 全局拖拽上传处理
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;

    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer?.files || []);
    console.log('拖拽文件数量:', files.length);

    if (files.length > 0) {
      // 验证文件类型
      const validFiles = files.filter(file => {
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        console.log('文件类型验证:', file.name, file.type, isImage || isVideo);
        return isImage || isVideo;
      });

      console.log('有效文件数量:', validFiles.length);

      if (validFiles.length > 0) {
        // 如果模态框已经打开，追加文件到现有列表
        if (showUploadModal) {
          setDraggedFiles(prev => {
            // 检查重复文件（基于文件名和大小）
            const existingFiles = new Set(prev.map(f => `${f.name}-${f.size}`));
            const newFiles = validFiles.filter(f => !existingFiles.has(`${f.name}-${f.size}`));
            console.log('追加拖拽文件:', newFiles.length, '个，跳过重复:', validFiles.length - newFiles.length, '个');
            return [...prev, ...newFiles];
          });
        } else {
          // 首次拖拽，设置文件并打开模态框
          setDraggedFiles(validFiles);
          setShowUploadModal(true);
        }
      } else {
        console.warn('没有有效的图片或视频文件');
      }
    }
  }, [showUploadModal]);

  // 添加全局拖拽事件监听
  useEffect(() => {
    const handleDragEnterGlobal = (e: DragEvent) => handleDragEnter(e);
    const handleDragLeaveGlobal = (e: DragEvent) => handleDragLeave(e);
    const handleDragOverGlobal = (e: DragEvent) => handleDragOver(e);
    const handleDropGlobal = (e: DragEvent) => handleDrop(e);

    document.addEventListener('dragenter', handleDragEnterGlobal);
    document.addEventListener('dragleave', handleDragLeaveGlobal);
    document.addEventListener('dragover', handleDragOverGlobal);
    document.addEventListener('drop', handleDropGlobal);

    return () => {
      document.removeEventListener('dragenter', handleDragEnterGlobal);
      document.removeEventListener('dragleave', handleDragLeaveGlobal);
      document.removeEventListener('dragover', handleDragOverGlobal);
      document.removeEventListener('drop', handleDropGlobal);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return {
    isDragOver,
    showUploadModal,
    setShowUploadModal,
    draggedFiles,
    setDraggedFiles,
  };
}
