/**
 * @fileoverview 帖子数据服务
 * @description 专门处理帖子数据的管理、过滤和状态处理
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 帖子接口
 */
export interface Post {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  coverImage?: string;
  author: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  tags: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  _count: {
    likes: number;
    comments: number;
    views: number;
  };
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  isPublished: boolean;
  status: string;
}

/**
 * 点赞状态接口
 */
export interface LikeState {
  isLiked: boolean;
  count: number;
}

/**
 * 排序选项类型
 */
export type SortOption = 'latest' | 'popular' | 'trending';

/**
 * 视图模式类型
 */
export type ViewMode = 'grid' | 'list';

/**
 * 过滤选项接口
 */
export interface FilterOptions {
  sortBy: SortOption;
  viewMode: ViewMode;
  searchQuery?: string;
  selectedTags?: string[];
  authorId?: string;
}

/**
 * 帖子数据服务类
 */
export class PostsDataService {
  /**
   * 格式化帖子数据
   */
  static formatPost(post: any): Post {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || this.generateExcerpt(post.content),
      coverImage: post.coverImage,
      author: {
        id: post.author.id,
        username: post.author.username,
        displayName: post.author.displayName || post.author.username,
        avatar: post.author.avatar,
      },
      tags: post.tags || [],
      _count: {
        likes: post._count?.likes || post.likeCount || 0,
        comments: post._count?.comments || post.commentCount || 0,
        views: post._count?.views || post.viewCount || 0,
      },
      likeCount: post._count?.likes || post.likeCount || 0,
      commentCount: post._count?.comments || post.commentCount || 0,
      viewCount: post._count?.views || post.viewCount || 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isPublished: post.isPublished !== false,
      status: post.status || 'published',
    };
  }

  /**
   * 生成摘要
   */
  static generateExcerpt(content?: string, maxLength: number = 150): string {
    if (!content) return '';
    
    // 移除HTML标签
    const plainText = content.replace(/<[^>]*>/g, '');
    
    if (plainText.length <= maxLength) {
      return plainText;
    }
    
    return plainText.slice(0, maxLength).trim() + '...';
  }

  /**
   * 合并点赞状态
   */
  static mergeLikeStates(
    posts: Post[],
    likeStates: Record<string, LikeState>
  ): Post[] {
    return posts.map(post => ({
      ...post,
      _count: {
        ...post._count,
        likes: likeStates[post.id]?.count ?? post._count.likes,
      },
      likeCount: likeStates[post.id]?.count ?? post.likeCount,
    }));
  }

  /**
   * 更新点赞状态
   */
  static updateLikeState(
    currentStates: Record<string, LikeState>,
    postId: string,
    isLiked: boolean,
    currentCount?: number
  ): Record<string, LikeState> {
    const currentState = currentStates[postId];
    const baseCount = currentCount ?? currentState?.count ?? 0;
    
    return {
      ...currentStates,
      [postId]: {
        isLiked,
        count: isLiked 
          ? baseCount + (currentState?.isLiked ? 0 : 1)
          : Math.max(0, baseCount - (currentState?.isLiked ? 1 : 0)),
      },
    };
  }

  /**
   * 过滤帖子
   */
  static filterPosts(posts: Post[], options: Partial<FilterOptions>): Post[] {
    let filtered = [...posts];

    // 搜索过滤
    if (options.searchQuery?.trim()) {
      const query = options.searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.content?.toLowerCase().includes(query) ||
        post.author.username.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.name.toLowerCase().includes(query))
      );
    }

    // 标签过滤
    if (options.selectedTags?.length) {
      filtered = filtered.filter(post =>
        options.selectedTags!.some(tagId =>
          post.tags.some(tag => tag.id === tagId)
        )
      );
    }

    // 作者过滤
    if (options.authorId) {
      filtered = filtered.filter(post => post.author.id === options.authorId);
    }

    return filtered;
  }

  /**
   * 排序帖子
   */
  static sortPosts(posts: Post[], sortBy: SortOption): Post[] {
    const sorted = [...posts];

    switch (sortBy) {
      case 'latest':
        return sorted.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      
      case 'popular':
        return sorted.sort((a, b) => {
          const aScore = a._count.likes + a._count.comments;
          const bScore = b._count.likes + b._count.comments;
          return bScore - aScore;
        });
      
      case 'trending':
        return sorted.sort((a, b) => {
          // 计算趋势分数：最近的互动 + 总互动数
          const now = Date.now();
          const aAge = now - new Date(a.createdAt).getTime();
          const bAge = now - new Date(b.createdAt).getTime();
          
          const aScore = (a._count.likes + a._count.comments + a._count.views) / (aAge / (1000 * 60 * 60 * 24) + 1);
          const bScore = (b._count.likes + b._count.comments + b._count.views) / (bAge / (1000 * 60 * 60 * 24) + 1);
          
          return bScore - aScore;
        });
      
      default:
        return sorted;
    }
  }

  /**
   * 获取排序选项标签
   */
  static getSortLabel(sortBy: SortOption): string {
    const labels: Record<SortOption, string> = {
      latest: '最新发布',
      popular: '最受欢迎',
      trending: '热门趋势',
    };
    return labels[sortBy];
  }

  /**
   * 获取帖子统计摘要
   */
  static getPostStats(posts: Post[]): {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    averageLikes: number;
  } {
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, post) => sum + post._count.likes, 0);
    const totalComments = posts.reduce((sum, post) => sum + post._count.comments, 0);
    const totalViews = posts.reduce((sum, post) => sum + post._count.views, 0);
    const averageLikes = totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0;

    return {
      totalPosts,
      totalLikes,
      totalComments,
      totalViews,
      averageLikes,
    };
  }

  /**
   * 获取热门标签
   */
  static getPopularTags(posts: Post[], limit: number = 10): Array<{
    id: string;
    name: string;
    count: number;
    color?: string;
  }> {
    const tagCounts = new Map<string, { name: string; count: number; color?: string }>();

    posts.forEach(post => {
      post.tags.forEach(tag => {
        const existing = tagCounts.get(tag.id);
        if (existing) {
          existing.count++;
        } else {
          tagCounts.set(tag.id, {
            name: tag.name,
            count: 1,
            color: tag.color,
          });
        }
      });
    });

    return Array.from(tagCounts.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 检查帖子是否可以点赞
   */
  static canLikePost(post: Post, currentUserId?: string): {
    canLike: boolean;
    reason?: string;
  } {
    if (!currentUserId) {
      return { canLike: false, reason: '请先登录' };
    }

    if (post.author.id === currentUserId) {
      return { canLike: false, reason: '不能给自己的帖子点赞' };
    }

    if (!post.isPublished) {
      return { canLike: false, reason: '帖子未发布' };
    }

    return { canLike: true };
  }

  /**
   * 格式化时间显示
   */
  static formatTimeAgo(date: string | Date): string {
    const now = new Date();
    const postDate = new Date(date);
    const diffMs = now.getTime() - postDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return postDate.toLocaleDateString('zh-CN');
  }

  /**
   * 生成帖子URL
   */
  static generatePostUrl(postId: string): string {
    return `/posts/${postId}`;
  }

  /**
   * 生成作者URL
   */
  static generateAuthorUrl(authorId: string): string {
    return `/users/${authorId}`;
  }
}

/**
 * 导出服务创建函数
 */
export const createPostsDataService = () => PostsDataService;
