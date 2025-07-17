/**
 * @fileoverview 管理员评论系统类型定义
 * @description 包含评论管理相关的所有TypeScript类型定义
 */

export interface CommentAuthor {
  id: string;
  username: string;
  displayName?: string;
  userLevel: string;
  isVerified: boolean;
}

export interface CommentPost {
  id: string;
  title: string;
  contentType: string;
  author: {
    username: string;
    displayName?: string;
  };
}

export interface AdminComment {
  id: string;
  content: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  author?: CommentAuthor;
  guestName?: string;
  post?: CommentPost;
  likeCount: number;
  dislikeCount: number;
  replyCount: number;
  hotScore?: number;
  isPinned: boolean;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  mentions?: string;
}

export interface GlobalStats {
  totalComments: number;
  pendingComments: number;
  approvedComments: number;
  rejectedComments: number;
  guestComments: number;
  todayComments: number;
}

export interface ReactionConfig {
  id: string;
  likeWeight: number;
  dislikeWeight: number;
  enableLike: boolean;
  enableDislike: boolean;
  showCounts: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  updater?: {
    username: string;
    displayName?: string;
  };
}

export interface ConfigForm {
  likeWeight: number;
  dislikeWeight: number;
  enableLike: boolean;
  enableDislike: boolean;
  showCounts: boolean;
  description: string;
}

export interface CommentFilters {
  selectedUserLevel: string;
  includeGuests: boolean;
  searchQuery: string;
  userSearchQuery: string;
  selectedStatus: "PENDING" | "APPROVED" | "REJECTED";
}

export interface CommentActions {
  handleCommentAction: (action: string, commentId: string, data?: any) => void;
  handleBatchAction: (action: "APPROVE" | "REJECT") => void;
  handleCommentSelect: (commentId: string, checked: boolean) => void;
  handleSelectAll: (checked: boolean) => void;
  handleUserSearch: () => void;
  handleRefreshAll: () => void;
}

export interface MutationStates {
  moderateCommentMutation: {
    isPending: boolean;
    mutate: (data: any) => void;
  };
  batchModerateMutation: {
    isPending: boolean;
    mutate: (data: any) => void;
  };
  togglePinMutation: {
    isPending: boolean;
    mutate: (data: any) => void;
  };
  deleteCommentMutation: {
    isPending: boolean;
    mutate: (data: any) => void;
  };
  updateConfigMutation: {
    isPending: boolean;
    mutate: (data: any) => void;
  };
  resetConfigMutation: {
    isPending: boolean;
    mutate: (data: any) => void;
  };
}

export interface QueryStates {
  globalStats: {
    data?: GlobalStats;
    isPending: boolean;
    refetch: () => void;
  };
  latestComments: {
    data?: AdminComment[];
    isPending: boolean;
    refetch: () => void;
  };
  hotComments: {
    data?: AdminComment[];
    isPending: boolean;
    refetch: () => void;
  };
  dislikedComments: {
    data?: AdminComment[];
    isPending: boolean;
    refetch: () => void;
  };
  pendingCommentsData: {
    data?: {
      comments: AdminComment[];
      total: number;
    };
    isPending: boolean;
    refetch: () => void;
  };
  userCommentsData: {
    data?: {
      comments: AdminComment[];
    };
    isPending: boolean;
    refetch: () => void;
  };
  reactionConfig: {
    data?: ReactionConfig;
    isPending: boolean;
    refetch: () => void;
  };
}

export interface TabState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export interface SelectionState {
  selectedComments: string[];
  setSelectedComments: (comments: string[]) => void;
}

export interface ConfigState {
  configForm: ConfigForm;
  setConfigForm: (config: ConfigForm | ((prev: ConfigForm) => ConfigForm)) => void;
}

export interface AdminCommentsHookReturn {
  // 状态
  filters: CommentFilters;
  setFilters: {
    setSelectedUserLevel: (level: string) => void;
    setIncludeGuests: (include: boolean) => void;
    setSearchQuery: (query: string) => void;
    setUserSearchQuery: (query: string) => void;
    setSelectedStatus: (status: "PENDING" | "APPROVED" | "REJECTED") => void;
  };
  tabState: TabState;
  selectionState: SelectionState;
  configState: ConfigState;
  
  // 查询状态
  queries: QueryStates;
  
  // 变更状态
  mutations: MutationStates;
  
  // 操作函数
  actions: CommentActions;
}
