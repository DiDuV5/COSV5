/**
 * @fileoverview 数据一致性检查器
 * @description 检查和修复数据库中的数据一致性问题
 * @author Augment AI
 * @date 2025-07-06
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client';

/**
 * 数据一致性问题接口
 */
export interface ConsistencyIssue {
  type: 'count_mismatch' | 'invalid_state' | 'orphaned_data' | 'constraint_violation';
  table: string;
  field: string;
  recordId: string;
  expected: number | string;
  actual: number | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

/**
 * 数据一致性检查结果
 */
export interface ConsistencyCheckResult {
  isConsistent: boolean;
  totalIssues: number;
  issuesBySeverity: Record<string, number>;
  issues: ConsistencyIssue[];
  recommendations: string[];
}

/**
 * 数据一致性检查器
 */
export class DataConsistencyChecker {
  constructor(private db: PrismaClient) {}

  /**
   * 执行完整的数据一致性检查
   */
  async checkAllConsistency(): Promise<ConsistencyCheckResult> {
    const issues: ConsistencyIssue[] = [];

    // 并行执行各种检查
    const [
      userCountIssues,
      postCountIssues,
      commentCountIssues,
      emailVerificationIssues,
      orphanedDataIssues,
    ] = await Promise.all([
      this.checkUserCountConsistency(),
      this.checkPostCountConsistency(),
      this.checkCommentCountConsistency(),
      this.checkEmailVerificationConsistency(),
      this.checkOrphanedData(),
    ]);

    issues.push(
      ...userCountIssues,
      ...postCountIssues,
      ...commentCountIssues,
      ...emailVerificationIssues,
      ...orphanedDataIssues
    );

    // 统计问题严重程度
    const issuesBySeverity = {
      low: issues.filter(i => i.severity === 'low').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      high: issues.filter(i => i.severity === 'high').length,
      critical: issues.filter(i => i.severity === 'critical').length,
    };

    // 生成修复建议
    const recommendations = this.generateRecommendations(issues);

    return {
      isConsistent: issues.length === 0,
      totalIssues: issues.length,
      issuesBySeverity,
      issues,
      recommendations,
    };
  }

  /**
   * 检查用户计数字段一致性
   */
  async checkUserCountConsistency(): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 检查帖子计数
    const userPostCountIssues = await this.db.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.username,
        u.posts_count as stored_count,
        COUNT(p.id) as actual_count
      FROM users u
      LEFT JOIN posts p ON u.id = p.author_id 
        AND p.published_at IS NOT NULL 
        AND p.is_public = true
      GROUP BY u.id, u.username, u.posts_count
      HAVING u.posts_count != COUNT(p.id)
      LIMIT 100;
    `;

    userPostCountIssues.forEach(issue => {
      issues.push({
        type: 'count_mismatch',
        table: 'users',
        field: 'posts_count',
        recordId: issue.id,
        expected: issue.actual_count,
        actual: issue.stored_count,
        severity: 'medium',
        description: `用户 ${issue.username} 的帖子计数不一致：存储值 ${issue.stored_count}，实际值 ${issue.actual_count}`,
      });
    });

    // 检查关注者计数
    const userFollowerCountIssues = await this.db.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.username,
        u.followers_count as stored_count,
        COUNT(f.id) as actual_count
      FROM users u
      LEFT JOIN follows f ON u.id = f.following_id
      GROUP BY u.id, u.username, u.followers_count
      HAVING u.followers_count != COUNT(f.id)
      LIMIT 100;
    `;

    userFollowerCountIssues.forEach(issue => {
      issues.push({
        type: 'count_mismatch',
        table: 'users',
        field: 'followers_count',
        recordId: issue.id,
        expected: issue.actual_count,
        actual: issue.stored_count,
        severity: 'medium',
        description: `用户 ${issue.username} 的关注者计数不一致：存储值 ${issue.stored_count}，实际值 ${issue.actual_count}`,
      });
    });

    // 检查关注数计数
    const userFollowingCountIssues = await this.db.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.username,
        u.following_count as stored_count,
        COUNT(f.id) as actual_count
      FROM users u
      LEFT JOIN follows f ON u.id = f.follower_id
      GROUP BY u.id, u.username, u.following_count
      HAVING u.following_count != COUNT(f.id)
      LIMIT 100;
    `;

    userFollowingCountIssues.forEach(issue => {
      issues.push({
        type: 'count_mismatch',
        table: 'users',
        field: 'following_count',
        recordId: issue.id,
        expected: issue.actual_count,
        actual: issue.stored_count,
        severity: 'medium',
        description: `用户 ${issue.username} 的关注数计数不一致：存储值 ${issue.stored_count}，实际值 ${issue.actual_count}`,
      });
    });

    return issues;
  }

  /**
   * 检查帖子计数字段一致性
   */
  async checkPostCountConsistency(): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 检查帖子点赞数
    const postLikeCountIssues = await this.db.$queryRaw<any[]>`
      SELECT 
        p.id,
        p.title,
        p.like_count as stored_count,
        COUNT(l.id) as actual_count
      FROM posts p
      LEFT JOIN likes l ON p.id = l.post_id
      GROUP BY p.id, p.title, p.like_count
      HAVING p.like_count != COUNT(l.id)
      LIMIT 100;
    `;

    postLikeCountIssues.forEach(issue => {
      issues.push({
        type: 'count_mismatch',
        table: 'posts',
        field: 'like_count',
        recordId: issue.id,
        expected: issue.actual_count,
        actual: issue.stored_count,
        severity: 'low',
        description: `帖子 "${issue.title}" 的点赞数不一致：存储值 ${issue.stored_count}，实际值 ${issue.actual_count}`,
      });
    });

    // 检查帖子评论数
    const postCommentCountIssues = await this.db.$queryRaw<any[]>`
      SELECT 
        p.id,
        p.title,
        p.comment_count as stored_count,
        COUNT(c.id) as actual_count
      FROM posts p
      LEFT JOIN comments c ON p.id = c.post_id AND c.is_deleted = false
      GROUP BY p.id, p.title, p.comment_count
      HAVING p.comment_count != COUNT(c.id)
      LIMIT 100;
    `;

    postCommentCountIssues.forEach(issue => {
      issues.push({
        type: 'count_mismatch',
        table: 'posts',
        field: 'comment_count',
        recordId: issue.id,
        expected: issue.actual_count,
        actual: issue.stored_count,
        severity: 'low',
        description: `帖子 "${issue.title}" 的评论数不一致：存储值 ${issue.stored_count}，实际值 ${issue.actual_count}`,
      });
    });

    return issues;
  }

  /**
   * 检查评论计数字段一致性
   */
  async checkCommentCountConsistency(): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 检查评论回复数
    const commentReplyCountIssues = await this.db.$queryRaw<any[]>`
      SELECT 
        c.id,
        c.content,
        c.reply_count as stored_count,
        COUNT(r.id) as actual_count
      FROM comments c
      LEFT JOIN comments r ON c.id = r.parent_id AND r.is_deleted = false
      WHERE c.parent_id IS NULL
      GROUP BY c.id, c.content, c.reply_count
      HAVING c.reply_count != COUNT(r.id)
      LIMIT 100;
    `;

    commentReplyCountIssues.forEach(issue => {
      issues.push({
        type: 'count_mismatch',
        table: 'comments',
        field: 'reply_count',
        recordId: issue.id,
        expected: issue.actual_count,
        actual: issue.stored_count,
        severity: 'low',
        description: `评论的回复数不一致：存储值 ${issue.stored_count}，实际值 ${issue.actual_count}`,
      });
    });

    return issues;
  }

  /**
   * 检查邮箱验证状态一致性
   */
  async checkEmailVerificationConsistency(): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 检查已验证但无邮箱的用户
    const verifiedWithoutEmail = await this.db.user.findMany({
      where: {
        isVerified: true,
        OR: [
          { email: null },
          { email: '' },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        isVerified: true,
      },
      take: 100,
    });

    verifiedWithoutEmail.forEach(user => {
      issues.push({
        type: 'invalid_state',
        table: 'users',
        field: 'is_verified',
        recordId: user.id,
        expected: 'false',
        actual: 'true',
        severity: 'high',
        description: `用户 ${user.username} 已验证但无邮箱地址`,
      });
    });

    return issues;
  }

  /**
   * 检查孤立数据
   */
  async checkOrphanedData(): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 检查孤立的帖子（作者不存在）
    const orphanedPosts = await this.db.$queryRaw<any[]>`
      SELECT p.id, p.title
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE u.id IS NULL
      LIMIT 50;
    `;

    orphanedPosts.forEach(post => {
      issues.push({
        type: 'orphaned_data',
        table: 'posts',
        field: 'author_id',
        recordId: post.id,
        expected: 'valid_user_id',
        actual: 'null_or_invalid',
        severity: 'critical',
        description: `帖子 "${post.title}" 的作者不存在`,
      });
    });

    // 检查孤立的评论（帖子不存在）
    const orphanedComments = await this.db.$queryRaw<any[]>`
      SELECT c.id, c.content
      FROM comments c
      LEFT JOIN posts p ON c.post_id = p.id
      WHERE p.id IS NULL
      LIMIT 50;
    `;

    orphanedComments.forEach(comment => {
      issues.push({
        type: 'orphaned_data',
        table: 'comments',
        field: 'post_id',
        recordId: comment.id,
        expected: 'valid_post_id',
        actual: 'null_or_invalid',
        severity: 'high',
        description: `评论的关联帖子不存在`,
      });
    });

    return issues;
  }

  /**
   * 生成修复建议
   */
  private generateRecommendations(issues: ConsistencyIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const countMismatchIssues = issues.filter(i => i.type === 'count_mismatch').length;
    const orphanedDataIssues = issues.filter(i => i.type === 'orphaned_data').length;

    if (criticalIssues > 0) {
      recommendations.push(`发现 ${criticalIssues} 个严重问题，建议立即修复`);
    }

    if (highIssues > 0) {
      recommendations.push(`发现 ${highIssues} 个高优先级问题，建议尽快修复`);
    }

    if (countMismatchIssues > 0) {
      recommendations.push(`发现 ${countMismatchIssues} 个计数不一致问题，建议运行数据一致性修复脚本`);
    }

    if (orphanedDataIssues > 0) {
      recommendations.push(`发现 ${orphanedDataIssues} 个孤立数据，建议清理或修复关联关系`);
    }

    if (issues.length === 0) {
      recommendations.push('数据一致性检查通过，未发现问题');
    } else {
      recommendations.push('建议定期运行数据一致性检查以确保数据质量');
    }

    return recommendations;
  }

  /**
   * 自动修复计数不一致问题
   */
  async autoFixCountMismatches(): Promise<{
    fixed: number;
    errors: string[];
  }> {
    let fixed = 0;
    const errors: string[] = [];

    try {
      // 修复用户帖子计数
      const userPostsFixed = await this.db.$executeRaw`
        UPDATE users 
        SET posts_count = (
          SELECT COUNT(*) 
          FROM posts 
          WHERE posts.author_id = users.id 
            AND posts.published_at IS NOT NULL 
            AND posts.is_public = true
        ),
        updated_at = NOW()
        WHERE posts_count != (
          SELECT COUNT(*) 
          FROM posts 
          WHERE posts.author_id = users.id 
            AND posts.published_at IS NOT NULL 
            AND posts.is_public = true
        );
      `;
      fixed += userPostsFixed;

      // 修复其他计数字段...
      // (这里可以添加更多修复逻辑)

    } catch (error) {
      errors.push(`修复过程中出错: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return { fixed, errors };
  }
}
