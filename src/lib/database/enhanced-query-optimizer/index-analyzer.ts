/**
 * @fileoverview 索引分析器
 * @description 提供数据库索引分析和优化建议功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { IndexSuggestion } from './types';

/**
 * 索引分析器
 */
export class IndexAnalyzer {
  private indexSuggestions: IndexSuggestion[] = [];

  /**
   * 生成索引建议
   */
  generateIndexSuggestions(queryPatterns: Map<string, number>): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];

    // 分析查询模式
    for (const [pattern, count] of queryPatterns.entries()) {
      if (count > 10) { // 频繁查询
        const suggestion = this.analyzeQueryPattern(pattern);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    // 更新内部建议列表
    this.indexSuggestions = suggestions;

    return suggestions;
  }

  /**
   * 获取索引建议
   */
  getIndexSuggestions(): IndexSuggestion[] {
    return [...this.indexSuggestions];
  }

  /**
   * 清理索引建议
   */
  clearIndexSuggestions(): void {
    this.indexSuggestions = [];
  }

  /**
   * 分析特定表的索引需求
   */
  analyzeTableIndexNeeds(tableName: string, queryPatterns: Map<string, number>): IndexSuggestion[] {
    const tablePatterns = new Map();
    
    // 过滤出特定表的查询模式
    for (const [pattern, count] of queryPatterns.entries()) {
      if (pattern.toLowerCase().includes(tableName.toLowerCase())) {
        tablePatterns.set(pattern, count);
      }
    }

    return this.generateIndexSuggestions(tablePatterns);
  }

  /**
   * 生成索引优化报告
   */
  generateIndexOptimizationReport(queryPatterns: Map<string, number>): {
    summary: string;
    suggestions: IndexSuggestion[];
    priorityRecommendations: string[];
  } {
    const suggestions = this.generateIndexSuggestions(queryPatterns);
    const priorityRecommendations: string[] = [];

    // 分析高优先级建议
    const highFrequencyPatterns = Array.from(queryPatterns.entries())
      .filter(([_, count]) => count > 50)
      .sort((a, b) => b[1] - a[1]);

    if (highFrequencyPatterns.length > 0) {
      priorityRecommendations.push(
        `发现${highFrequencyPatterns.length}个高频查询模式，建议优先优化`
      );
    }

    // 分析用户相关查询
    const userQueries = Array.from(queryPatterns.entries())
      .filter(([pattern]) => pattern.includes('user'))
      .reduce((sum, [_, count]) => sum + count, 0);

    if (userQueries > 100) {
      priorityRecommendations.push('用户相关查询频繁，建议优化用户表索引');
    }

    // 分析帖子相关查询
    const postQueries = Array.from(queryPatterns.entries())
      .filter(([pattern]) => pattern.includes('post'))
      .reduce((sum, [_, count]) => sum + count, 0);

    if (postQueries > 100) {
      priorityRecommendations.push('帖子相关查询频繁，建议优化帖子表索引');
    }

    const summary = `
索引分析报告:
- 总查询模式: ${queryPatterns.size}
- 生成建议: ${suggestions.length}
- 高频模式: ${highFrequencyPatterns.length}
- 用户查询: ${userQueries}次
- 帖子查询: ${postQueries}次
    `.trim();

    return {
      summary,
      suggestions,
      priorityRecommendations
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 分析查询模式
   */
  private analyzeQueryPattern(pattern: string): IndexSuggestion | null {
    // 用户相关查询优化
    if (pattern.includes('user.findMany')) {
      return {
        table: 'User',
        columns: ['userLevel', 'isActive'],
        reason: '频繁按用户级别和状态查询',
        expectedImprovement: '查询速度提升50-70%',
        suggestedSQL: 'CREATE INDEX idx_user_level_active ON "User" ("userLevel", "isActive");'
      };
    }

    if (pattern.includes('user.findUnique')) {
      return {
        table: 'User',
        columns: ['username'],
        reason: '频繁按用户名查询',
        expectedImprovement: '查询速度提升60-80%',
        suggestedSQL: 'CREATE INDEX idx_user_username ON "User" ("username");'
      };
    }

    // 帖子相关查询优化
    if (pattern.includes('post.findMany')) {
      return {
        table: 'Post',
        columns: ['publishedAt', 'likeCount'],
        reason: '频繁按发布时间和点赞数查询',
        expectedImprovement: '查询速度提升60-80%',
        suggestedSQL: 'CREATE INDEX idx_post_published_likes ON "Post" ("publishedAt" DESC, "likeCount" DESC);'
      };
    }

    if (pattern.includes('post.findMany') && pattern.includes('authorId')) {
      return {
        table: 'Post',
        columns: ['authorId', 'publishedAt'],
        reason: '频繁按作者和发布时间查询',
        expectedImprovement: '查询速度提升70-90%',
        suggestedSQL: 'CREATE INDEX idx_post_author_published ON "Post" ("authorId", "publishedAt" DESC);'
      };
    }

    // 评论相关查询优化
    if (pattern.includes('comment.findMany')) {
      return {
        table: 'Comment',
        columns: ['postId', 'createdAt'],
        reason: '频繁按帖子ID和创建时间查询评论',
        expectedImprovement: '查询速度提升50-70%',
        suggestedSQL: 'CREATE INDEX idx_comment_post_created ON "Comment" ("postId", "createdAt" DESC);'
      };
    }

    // 关注关系查询优化
    if (pattern.includes('follow.findMany')) {
      return {
        table: 'Follow',
        columns: ['followerId', 'followingId'],
        reason: '频繁查询关注关系',
        expectedImprovement: '查询速度提升60-80%',
        suggestedSQL: 'CREATE INDEX idx_follow_relationship ON "Follow" ("followerId", "followingId");'
      };
    }

    return null;
  }
}
