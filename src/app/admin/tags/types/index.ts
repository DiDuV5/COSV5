/**
 * @fileoverview 标签管理页面类型定义
 * @description 包含标签管理相关的所有TypeScript类型定义
 */

// 标签数据类型
export interface TagData {
  name: string;
  count: number;
  views: number;
  likes: number;
  comments: number;
  firstUsed: Date;
  lastUsed: Date;
  status: 'active' | 'disabled' | 'deleted';
}

// 标签统计数据类型
export interface TagStatsData {
  totalTags: number;
  totalPosts: number;
  topTags: Array<{
    name: string;
    count: number;
  }>;
  timeRange: string;
}

// 分页数据类型
export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// API响应类型
export interface TagsResponse {
  tags: TagData[];
  pagination: PaginationData;
}

// 筛选器状态类型
export interface FilterState {
  searchQuery: string;
  debouncedSearchQuery: string;
  statusFilter: 'all' | 'active' | 'disabled' | 'deleted';
  sortBy: 'name' | 'count' | 'created' | 'updated';
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
}

// 对话框状态类型
export interface DialogState {
  mergeDialogOpen: boolean;
  renameDialogOpen: boolean;
  deleteDialogOpen: boolean;
  selectedTagForRename: string;
  newTagName: string;
  targetTagName: string;
  operationReason: string;
  softDelete: boolean;
}

// 选择状态类型
export interface SelectionState {
  selectedTags: string[];
}

// 组件Props类型
export interface StatisticsCardsProps {
  statsData?: TagStatsData;
  isPending: boolean;
}

export interface SearchToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  statusFilter: FilterState['statusFilter'];
  onStatusFilterChange: (filter: FilterState['statusFilter']) => void;
  sortBy: FilterState['sortBy'];
  onSortByChange: (sortBy: FilterState['sortBy']) => void;
  sortOrder: FilterState['sortOrder'];
  onSortOrderChange: (order: FilterState['sortOrder']) => void;
}

export interface BatchOperationBarProps {
  selectedTags: string[];
  statusFilter: FilterState['statusFilter'];
  onMergeTags: () => void;
  onDeleteTags: () => void;
  onBatchRestore: () => void;
  onClearSelection: () => void;
}

export interface TagsTableProps {
  tags: TagData[];
  selectedTags: string[];
  isPending: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectTag: (tagName: string, checked: boolean) => void;
  onRenameTag: (tagName: string) => void;
  onMergeTags: () => void;
  onDeleteTags: () => void;
  onRestoreTag: (tagName: string) => void;
  statusFilter: FilterState['statusFilter'];
}

export interface PaginationControlsProps {
  pagination?: PaginationData;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export interface MergeTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTags: string[];
  targetTagName: string;
  onTargetTagNameChange: (name: string) => void;
  operationReason: string;
  onOperationReasonChange: (reason: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export interface RenameTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTagForRename: string;
  newTagName: string;
  onNewTagNameChange: (name: string) => void;
  operationReason: string;
  onOperationReasonChange: (reason: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export interface DeleteTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTags: string[];
  softDelete: boolean;
  onSoftDeleteChange: (softDelete: boolean) => void;
  operationReason: string;
  onOperationReasonChange: (reason: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

// Hook返回类型
export interface UseTagManagementReturn {
  // 状态
  filters: FilterState;
  dialogs: DialogState;
  selection: SelectionState;
  error: string | null;
  
  // 数据
  tagsData?: TagsResponse;
  statsData?: TagStatsData;
  isPending: boolean;
  
  // 操作函数
  setFilters: {
    setSearchQuery: (query: string) => void;
    setStatusFilter: (filter: FilterState['statusFilter']) => void;
    setSortBy: (sortBy: FilterState['sortBy']) => void;
    setSortOrder: (order: FilterState['sortOrder']) => void;
    setCurrentPage: (page: number) => void;
  };
  
  setDialogs: {
    setMergeDialogOpen: (open: boolean) => void;
    setRenameDialogOpen: (open: boolean) => void;
    setDeleteDialogOpen: (open: boolean) => void;
    setSelectedTagForRename: (tag: string) => void;
    setNewTagName: (name: string) => void;
    setTargetTagName: (name: string) => void;
    setOperationReason: (reason: string) => void;
    setSoftDelete: (softDelete: boolean) => void;
  };
  
  setSelection: {
    setSelectedTags: (tags: string[]) => void;
  };
  
  actions: {
    handleSelectAll: (checked: boolean) => void;
    handleSelectTag: (tagName: string, checked: boolean) => void;
    handleMergeTags: () => void;
    handleRenameTag: (tagName: string) => void;
    handleDeleteTags: () => void;
    handleRestoreTag: (tagName: string) => void;
    handleBatchRestore: () => void;
    handleRefresh: () => void;
    confirmMerge: () => void;
    confirmRename: () => void;
    confirmDelete: () => void;
  };
  
  // Mutations
  mutations: {
    mergeTagsMutation: any;
    renameTagMutation: any;
    deleteTagsMutation: any;
    restoreTagMutation: any;
    batchRestoreTagsMutation: any;
  };
}

// 操作类型枚举
export enum TagOperation {
  MERGE = 'merge',
  RENAME = 'rename',
  DELETE = 'delete',
  RESTORE = 'restore',
  BATCH_RESTORE = 'batch_restore',
}

// 错误类型
export interface TagManagementError {
  type: 'validation' | 'api' | 'network';
  message: string;
  details?: any;
}
