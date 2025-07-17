/**
 * @fileoverview CoserEden组件基础接口定义
 * @description 定义所有组件共用的基础接口和类型
 */

import { ReactNode, ReactElement, MouseEvent, KeyboardEvent } from 'react';

/**
 * 用户级别枚举 - CoserEden 6级权限体系
 */
export type UserLevel = 'GUEST' | 'USER' | 'VIP' | 'CREATOR' | 'ADMIN' | 'SUPER_ADMIN';

/**
 * 组件尺寸规格
 */
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 组件变体类型
 */
export type ComponentVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

/**
 * 验证状态类型
 */
export type ValidationState = 'valid' | 'invalid' | 'warning';

/**
 * 加载状态类型
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * 所有组件的基础Props接口
 */
export interface BaseComponentProps {
  /** 自定义CSS类名 */
  className?: string;
  /** 测试ID，用于自动化测试 */
  'data-testid'?: string;
  /** 组件ID */
  id?: string;
  /** 是否禁用组件 */
  isDisabled?: boolean;
  /** 组件子元素 */
  children?: ReactNode;
}

/**
 * 可加载状态的组件Props
 */
export interface LoadableComponentProps extends BaseComponentProps {
  /** 是否处于加载状态 */
  isLoading?: boolean;
  /** 加载状态文本 */
  loadingText?: string;
  /** 加载状态 */
  loadingState?: LoadingState;
}

/**
 * 可出错状态的组件Props
 */
export interface ErrorableComponentProps extends BaseComponentProps {
  /** 错误信息 */
  error?: Error | string | null;
  /** 错误处理回调 */
  onError?: (error: Error) => void;
  /** 重试回调 */
  onRetry?: () => void;
  /** 错误显示变体 */
  errorVariant?: 'inline' | 'toast' | 'modal';
}

/**
 * 表单控件基础Props
 */
export interface FormControlProps<T = string> extends BaseComponentProps {
  /** 控件值 */
  value?: T;
  /** 默认值 */
  defaultValue?: T;
  /** 值变化回调 */
  onChange?: (value: T) => void;
  /** 控件名称 */
  name?: string;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否必填 */
  isRequired?: boolean;
  /** 是否只读 */
  isReadOnly?: boolean;
  /** 验证状态 */
  validationState?: ValidationState;
  /** 帮助文本 */
  helperText?: string;
  /** 错误文本 */
  errorText?: string;
}

/**
 * 可选择组件Props
 */
export interface SelectableComponentProps<T = unknown> extends BaseComponentProps {
  /** 选中的项目 */
  selectedItems?: T[];
  /** 选择变化回调 */
  onSelectionChange?: (items: T[]) => void;
  /** 是否支持多选 */
  isMultiSelect?: boolean;
  /** 选择模式 */
  selectionMode?: 'single' | 'multiple' | 'none';
}

/**
 * 可排序组件Props
 */
export interface SortableComponentProps extends BaseComponentProps {
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortDirection?: 'asc' | 'desc';
  /** 排序变化回调 */
  onSortChange?: (sortBy: string, direction: 'asc' | 'desc') => void;
  /** 可排序的字段列表 */
  sortableFields?: string[];
}

/**
 * 可分页组件Props
 */
export interface PaginatableComponentProps extends BaseComponentProps {
  /** 当前页码 */
  currentPage?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 总条数 */
  totalItems?: number;
  /** 页码变化回调 */
  onPageChange?: (page: number) => void;
  /** 页面大小变化回调 */
  onPageSizeChange?: (size: number) => void;
  /** 是否显示页面大小选择器 */
  showPageSizeSelector?: boolean;
}

/**
 * 可搜索组件Props
 */
export interface SearchableComponentProps extends BaseComponentProps {
  /** 搜索关键词 */
  searchQuery?: string;
  /** 搜索变化回调 */
  onSearchChange?: (query: string) => void;
  /** 搜索占位符 */
  searchPlaceholder?: string;
  /** 是否显示搜索框 */
  showSearch?: boolean;
  /** 搜索防抖延迟（毫秒） */
  searchDebounce?: number;
}

/**
 * 用户相关组件Props
 */
export interface UserComponentProps extends BaseComponentProps {
  /** 用户信息 */
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    userLevel: UserLevel;
    isVerified: boolean;
  };
  /** 显示变体 */
  variant?: 'compact' | 'detailed' | 'card';
  /** 是否显示操作按钮 */
  showActions?: boolean;
}

/**
 * 媒体组件Props
 */
export interface MediaComponentProps extends BaseComponentProps {
  /** 媒体URL */
  src: string;
  /** 替代文本 */
  alt?: string;
  /** 媒体类型 */
  mediaType?: 'image' | 'video' | 'audio';
  /** 是否自动播放（视频/音频） */
  autoPlay?: boolean;
  /** 是否显示控制器 */
  showControls?: boolean;
  /** 加载失败回调 */
  onLoadError?: () => void;
}

/**
 * 模态框组件Props
 */
export interface ModalComponentProps extends BaseComponentProps {
  /** 是否显示模态框 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 模态框标题 */
  title?: string;
  /** 模态框大小 */
  size?: ComponentSize;
  /** 是否可通过点击遮罩关闭 */
  closeOnOverlayClick?: boolean;
  /** 是否可通过ESC键关闭 */
  closeOnEscape?: boolean;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
}

/**
 * 通知组件Props
 */
export interface NotificationComponentProps extends BaseComponentProps {
  /** 通知类型 */
  type: 'success' | 'error' | 'warning' | 'info';
  /** 通知标题 */
  title?: string;
  /** 通知内容 */
  message: string;
  /** 是否自动关闭 */
  autoClose?: boolean;
  /** 自动关闭延迟（毫秒） */
  autoCloseDelay?: number;
  /** 关闭回调 */
  onClose?: () => void;
  /** 操作按钮 */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: ComponentVariant;
  }>;
}

/**
 * 列表组件Props
 */
export interface ListComponentProps<T = unknown>
  extends BaseComponentProps,
          LoadableComponentProps,
          ErrorableComponentProps,
          PaginatableComponentProps,
          SearchableComponentProps {
  /** 列表项数据 */
  items: T[];
  /** 渲染单个项目的函数 */
  renderItem: (item: T, index: number) => ReactNode;
  /** 获取项目唯一键的函数 */
  keyExtractor: (item: T) => string;
  /** 空状态显示内容 */
  emptyContent?: ReactNode;
  /** 空状态文本 */
  emptyText?: string;
  /** 是否支持虚拟滚动 */
  enableVirtualization?: boolean;
  /** 项目高度（虚拟滚动时使用） */
  itemHeight?: number;
}

/**
 * 表格组件Props
 */
export interface TableComponentProps<T = unknown>
  extends BaseComponentProps,
          LoadableComponentProps,
          ErrorableComponentProps,
          SortableComponentProps,
          PaginatableComponentProps,
          SelectableComponentProps<T> {
  /** 表格数据 */
  data: T[];
  /** 列定义 */
  columns: Array<{
    key: string;
    title: string;
    render?: (value: unknown, record: T, index: number) => ReactNode;
    sortable?: boolean;
    width?: number | string;
    align?: 'left' | 'center' | 'right';
  }>;
  /** 行键提取函数 */
  rowKey: (record: T) => string;
  /** 行点击回调 */
  onRowClick?: (record: T, index: number) => void;
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否斑马纹 */
  striped?: boolean;
  /** 表格大小 */
  size?: ComponentSize;
}

/**
 * 按钮组件Props
 */
export interface ButtonComponentProps extends BaseComponentProps, LoadableComponentProps {
  /** 按钮变体 */
  variant?: ComponentVariant;
  /** 按钮大小 */
  size?: ComponentSize;
  /** 左侧图标 */
  leftIcon?: ReactElement;
  /** 右侧图标 */
  rightIcon?: ReactElement;
  /** 点击回调 */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** 按钮类型 */
  type?: 'button' | 'submit' | 'reset';
  /** 是否为块级按钮 */
  isFullWidth?: boolean;
}

/**
 * 输入框组件Props
 */
export interface InputComponentProps extends FormControlProps<string> {
  /** 输入类型 */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  /** 输入框大小 */
  size?: ComponentSize;
  /** 左侧图标 */
  leftIcon?: ReactElement;
  /** 右侧图标 */
  rightIcon?: ReactElement;
  /** 最大长度 */
  maxLength?: number;
  /** 最小长度 */
  minLength?: number;
  /** 输入回调 */
  onInput?: (event: React.FormEvent<HTMLInputElement>) => void;
  /** 焦点回调 */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** 失焦回调 */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** 键盘事件回调 */
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * 卡片组件Props
 */
export interface CardComponentProps extends BaseComponentProps {
  /** 卡片标题 */
  title?: string;
  /** 卡片副标题 */
  subtitle?: string;
  /** 头部内容 */
  header?: ReactNode;
  /** 底部内容 */
  footer?: ReactNode;
  /** 是否显示边框 */
  bordered?: boolean;
  /** 是否可悬停 */
  hoverable?: boolean;
  /** 卡片大小 */
  size?: ComponentSize;
  /** 点击回调 */
  onClick?: () => void;
}
