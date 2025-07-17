/**
 * @fileoverview 帖子页面模块索引
 * @description 统一导出帖子页面相关的组件、服务和类型
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

// 导出服务
export { PostsDataService, createPostsDataService } from './services/posts-data-service';

// 导出组件
export { PostCard, PostCardSkeleton } from './components/PostCard';
export { 
  PostsFilter, 
  SimplePostsFilter, 
  PostsStats, 
  PostsFilterSkeleton 
} from './components/PostsFilter';

// 导出类型
export type {
  Post,
  LikeState,
  SortOption,
  ViewMode,
  FilterOptions,
} from './services/posts-data-service';

export type {
  PostCardProps,
} from './components/PostCard';

export type {
  PostsFilterProps,
} from './components/PostsFilter';
