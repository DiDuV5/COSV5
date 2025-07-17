/**
 * @fileoverview 媒体灯箱Hook
 * @description 管理媒体灯箱的状态和操作
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';
import type { MediaClickHandler, PermissionUpgradeHandler } from '../types';

export function useLightbox() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // 媒体点击处理函数
  const handleMediaClick: MediaClickHandler = useCallback((media: any, index: number) => {
    setCurrentMediaIndex(index);
    setLightboxOpen(true);
  }, []);

  // 权限升级处理函数
  const handlePermissionUpgrade: PermissionUpgradeHandler = useCallback(() => {
    // 这里可以跳转到会员升级页面或显示升级对话框
    // 暂时使用alert提示，实际项目中应该跳转到升级页面
    alert('权限升级功能开发中，敬请期待！');
  }, []);

  // 关闭灯箱
  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  return {
    lightboxOpen,
    currentMediaIndex,
    handleMediaClick,
    handlePermissionUpgrade,
    closeLightbox,
    setCurrentMediaIndex,
  };
}
