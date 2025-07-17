/**
 * @fileoverview 增强的Toast通知系统
 * @description 提供丰富的通知功能，包括成功、错误、警告、信息等类型
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import * as React from 'react';
import { toast as baseToast } from 'sonner';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * 通知类型
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

/**
 * 通知选项
 */
export interface NotificationOptions {
  /** 通知标题 */
  title?: string;
  /** 通知描述 */
  description?: string;
  /** 持续时间（毫秒），0表示不自动关闭 */
  duration?: number;
  /** 是否可关闭 */
  dismissible?: boolean;
  /** 操作按钮 */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** 取消按钮 */
  cancel?: {
    label: string;
    onClick?: () => void;
  };
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 是否重要（会在页面顶部显示） */
  important?: boolean;
  /** 通知ID（用于更新或关闭特定通知） */
  id?: string;
}

/**
 * 预定义的通知消息
 */
export const NOTIFICATION_MESSAGES = {
  // 成功消息
  SUCCESS: {
    SAVE: { title: '保存成功', description: '您的更改已成功保存' },
    UPDATE: { title: '更新成功', description: '信息已成功更新' },
    DELETE: { title: '删除成功', description: '项目已成功删除' },
    UPLOAD: { title: '上传成功', description: '文件已成功上传' },
    SUBMIT: { title: '提交成功', description: '表单已成功提交' },
    REGISTER: { title: '注册成功', description: '账户已成功创建' },
    LOGIN: { title: '登录成功', description: '欢迎回来！' },
    VERIFY: { title: '验证成功', description: '邮箱验证已完成' },
    APPROVE: { title: '审核通过', description: '您的申请已通过审核' },
    PUBLISH: { title: '发布成功', description: '内容已成功发布' },
  },

  // 错误消息
  ERROR: {
    SAVE: { title: '保存失败', description: '保存过程中出现错误，请重试' },
    UPDATE: { title: '更新失败', description: '更新过程中出现错误，请重试' },
    DELETE: { title: '删除失败', description: '删除过程中出现错误，请重试' },
    UPLOAD: { title: '上传失败', description: '文件上传失败，请检查文件格式和大小' },
    SUBMIT: { title: '提交失败', description: '表单提交失败，请检查输入信息' },
    NETWORK: { title: '网络错误', description: '网络连接失败，请检查网络设置' },
    PERMISSION: { title: '权限不足', description: '您没有权限执行此操作' },
    VALIDATION: { title: '输入错误', description: '请检查输入信息是否正确' },
    SERVER: { title: '服务器错误', description: '服务器出现临时故障，请稍后重试' },
    TIMEOUT: { title: '请求超时', description: '请求超时，请稍后重试' },
  },

  // 警告消息
  WARNING: {
    UNSAVED: { title: '有未保存的更改', description: '离开页面前请保存您的更改' },
    QUOTA: { title: '配额即将用完', description: '您的使用配额即将达到上限' },
    EXPIRE: { title: '即将过期', description: '您的会话即将过期，请及时保存' },
    LIMIT: { title: '达到限制', description: '您已达到操作限制，请稍后再试' },
    DUPLICATE: { title: '重复操作', description: '检测到重复操作，请确认是否继续' },
  },

  // 信息消息
  INFO: {
    LOADING: { title: '正在处理', description: '请稍候，正在处理您的请求' },
    SYNC: { title: '正在同步', description: '数据同步中，请勿关闭页面' },
    UPDATE_AVAILABLE: { title: '有新版本', description: '发现新版本，建议更新' },
    MAINTENANCE: { title: '系统维护', description: '系统将在指定时间进行维护' },
    FEATURE: { title: '新功能', description: '发现新功能，点击了解更多' },
  },
} as const;

/**
 * 增强的Toast通知类
 */
class EnhancedToast {
  /**
   * 显示成功通知
   */
  success(message: string | NotificationOptions, options?: NotificationOptions) {
    return this.show('success', message, options);
  }

  /**
   * 显示错误通知
   */
  error(message: string | NotificationOptions, options?: NotificationOptions) {
    return this.show('error', message, options);
  }

  /**
   * 显示警告通知
   */
  warning(message: string | NotificationOptions, options?: NotificationOptions) {
    return this.show('warning', message, options);
  }

  /**
   * 显示信息通知
   */
  info(message: string | NotificationOptions, options?: NotificationOptions) {
    return this.show('info', message, options);
  }

  /**
   * 显示加载通知
   */
  loading(message: string | NotificationOptions, options?: NotificationOptions) {
    return this.show('loading', message, options);
  }

  /**
   * 显示通知的核心方法
   */
  private show(
    type: NotificationType,
    message: string | NotificationOptions,
    options?: NotificationOptions
  ) {
    const config = typeof message === 'string'
      ? { description: message, ...options }
      : { ...message, ...options };

    const {
      title,
      description,
      duration = this.getDefaultDuration(type),
      dismissible = true,
      action,
      cancel,
      icon,
      important = false,
      id,
    } = config;

    const toastOptions = {
      id,
      duration: duration === 0 ? Infinity : duration,
      dismissible,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
      cancel: cancel ? {
        label: cancel.label,
        onClick: cancel.onClick,
      } : undefined,
      icon: icon || this.getDefaultIcon(type),
      className: this.getToastClassName(type, important),
    };

    const content = title ? `${title}${description ? `: ${description}` : ''}` : description;

    switch (type) {
      case 'success':
        return baseToast.success(content, toastOptions as any);
      case 'error':
        return baseToast.error(content, toastOptions as any);
      case 'warning':
        return baseToast.warning(content, toastOptions as any);
      case 'info':
        return baseToast.info(content, toastOptions as any);
      case 'loading':
        return baseToast.loading(content, toastOptions as any);
      default:
        return baseToast(content, toastOptions as any);
    }
  }

  /**
   * 获取默认持续时间
   */
  private getDefaultDuration(type: NotificationType): number {
    switch (type) {
      case 'success':
        return 3000;
      case 'error':
        return 5000;
      case 'warning':
        return 4000;
      case 'info':
        return 3000;
      case 'loading':
        return 0; // 加载通知不自动关闭
      default:
        return 3000;
    }
  }

  /**
   * 获取默认图标
   */
  private getDefaultIcon(type: NotificationType): React.ReactNode {
    switch (type) {
      case 'success':
        return React.createElement(CheckCircle, { className: "h-4 w-4" });
      case 'error':
        return React.createElement(AlertCircle, { className: "h-4 w-4" });
      case 'warning':
        return React.createElement(AlertTriangle, { className: "h-4 w-4" });
      case 'info':
        return React.createElement(Info, { className: "h-4 w-4" });
      case 'loading':
        return React.createElement('div', {
          className: "h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        });
      default:
        return null;
    }
  }

  /**
   * 获取Toast样式类名
   */
  private getToastClassName(type: NotificationType, important: boolean): string {
    const baseClass = important ? 'toast-important' : '';

    switch (type) {
      case 'success':
        return `${baseClass} toast-success`;
      case 'error':
        return `${baseClass} toast-error`;
      case 'warning':
        return `${baseClass} toast-warning`;
      case 'info':
        return `${baseClass} toast-info`;
      case 'loading':
        return `${baseClass} toast-loading`;
      default:
        return baseClass;
    }
  }

  /**
   * 关闭特定通知
   */
  dismiss(id?: string) {
    return baseToast.dismiss(id);
  }

  /**
   * 关闭所有通知
   */
  dismissAll() {
    return baseToast.dismiss();
  }

  /**
   * 更新现有通知
   */
  update(id: string, message: string | NotificationOptions, options?: NotificationOptions) {
    this.dismiss(id);
    return this.show('info', message, { ...options, id });
  }

  /**
   * 显示操作确认通知
   */
  confirm(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    options?: NotificationOptions
  ) {
    return this.show('warning', message, {
      ...options,
      duration: 0,
      action: {
        label: '确认',
        onClick: onConfirm,
      },
      cancel: {
        label: '取消',
        onClick: onCancel,
      },
    });
  }

  /**
   * 显示进度通知
   */
  progress(
    message: string,
    progress: number,
    options?: NotificationOptions
  ) {
    const progressMessage = `${message} (${Math.round(progress)}%)`;
    return this.loading(progressMessage, options);
  }
}

// 创建全局实例
export const toast = new EnhancedToast();

// 便捷方法
export const showSuccess = (message: string, options?: NotificationOptions) =>
  toast.success(message, options);

export const showError = (message: string, options?: NotificationOptions) =>
  toast.error(message, options);

export const showWarning = (message: string, options?: NotificationOptions) =>
  toast.warning(message, options);

export const showInfo = (message: string, options?: NotificationOptions) =>
  toast.info(message, options);

export const showLoading = (message: string, options?: NotificationOptions) =>
  toast.loading(message, options);

// 预定义通知方法
export const notifications = {
  // 成功通知
  saveSuccess: () => toast.success(NOTIFICATION_MESSAGES.SUCCESS.SAVE),
  updateSuccess: () => toast.success(NOTIFICATION_MESSAGES.SUCCESS.UPDATE),
  deleteSuccess: () => toast.success(NOTIFICATION_MESSAGES.SUCCESS.DELETE),
  uploadSuccess: () => toast.success(NOTIFICATION_MESSAGES.SUCCESS.UPLOAD),

  // 错误通知
  saveError: () => toast.error(NOTIFICATION_MESSAGES.ERROR.SAVE),
  updateError: () => toast.error(NOTIFICATION_MESSAGES.ERROR.UPDATE),
  deleteError: () => toast.error(NOTIFICATION_MESSAGES.ERROR.DELETE),
  uploadError: () => toast.error(NOTIFICATION_MESSAGES.ERROR.UPLOAD),
  networkError: () => toast.error(NOTIFICATION_MESSAGES.ERROR.NETWORK),

  // 警告通知
  unsavedChanges: () => toast.warning(NOTIFICATION_MESSAGES.WARNING.UNSAVED),
  quotaWarning: () => toast.warning(NOTIFICATION_MESSAGES.WARNING.QUOTA),

  // 信息通知
  updateAvailable: () => toast.info(NOTIFICATION_MESSAGES.INFO.UPDATE_AVAILABLE),
  maintenance: () => toast.info(NOTIFICATION_MESSAGES.INFO.MAINTENANCE),
};

export default toast;
