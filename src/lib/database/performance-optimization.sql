-- CoserEden数据库性能优化索引
-- 解决慢查询问题，提升API响应时间

-- ==================== Post表索引优化 ====================

-- 1. 优化标签搜索查询 (解决tags contains查询慢的问题)
CREATE INDEX IF NOT EXISTS idx_posts_tags_gin ON posts USING gin(tags gin_trgm_ops);

-- 2. 优化发布时间排序查询
CREATE INDEX IF NOT EXISTS idx_posts_published_at_desc ON posts (published_at DESC) WHERE published_at IS NOT NULL;

-- 3. 优化作者查询
CREATE INDEX IF NOT EXISTS idx_posts_author_published ON posts (author_id, published_at DESC) WHERE published_at IS NOT NULL;

-- 4. 优化热门帖子查询 (按点赞数、浏览数排序)
CREATE INDEX IF NOT EXISTS idx_posts_hot_metrics ON posts (like_count DESC, view_count DESC, published_at DESC) WHERE published_at IS NOT NULL;

-- 5. 优化公开帖子查询
CREATE INDEX IF NOT EXISTS idx_posts_public_published ON posts (is_public, published_at DESC) WHERE is_public = true AND published_at IS NOT NULL;

-- ==================== Comment表索引优化 ====================

-- 6. 优化帖子评论查询
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments (post_id, created_at DESC);

-- 7. 优化用户评论查询
CREATE INDEX IF NOT EXISTS idx_comments_author_created ON comments (author_id, created_at DESC);

-- ==================== Category表索引优化 ====================

-- 8. 优化分类名称查询
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories (name);

-- 9. 优化分类层级查询
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id) WHERE parent_id IS NOT NULL;

-- ==================== User表索引优化 ====================

-- 10. 优化用户名查询
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- 11. 优化邮箱查询
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 12. 优化用户状态查询
CREATE INDEX IF NOT EXISTS idx_users_active_verified ON users (is_active, is_verified) WHERE is_active = true;

-- ==================== 复合索引优化 ====================

-- 13. 优化帖子搜索 (标题+描述)
CREATE INDEX IF NOT EXISTS idx_posts_search_text ON posts USING gin((title || ' ' || COALESCE(description, '')) gin_trgm_ops);

-- 14. 优化媒体关联查询
CREATE INDEX IF NOT EXISTS idx_media_post_type ON media (post_id, media_type);

-- ==================== 统计查询优化 ====================

-- 15. 优化统计查询 (按时间范围)
CREATE INDEX IF NOT EXISTS idx_posts_stats_time ON posts (created_at, view_count, like_count, comment_count);

-- 16. 优化用户统计查询
CREATE INDEX IF NOT EXISTS idx_posts_author_stats ON posts (author_id, view_count, like_count) WHERE published_at IS NOT NULL;

-- ==================== 启用必要的扩展 ====================

-- 启用pg_trgm扩展用于文本搜索优化
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 启用btree_gin扩展用于复合索引优化
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ==================== 查询优化建议 ====================

-- 1. 对于标签搜索，建议使用GIN索引而不是LIKE查询
-- 2. 对于排序查询，确保ORDER BY字段有对应索引
-- 3. 对于WHERE条件，确保过滤字段有索引
-- 4. 对于JOIN查询，确保关联字段有索引
-- 5. 定期执行ANALYZE更新统计信息

-- ==================== 维护命令 ====================

-- 更新表统计信息
ANALYZE posts;
ANALYZE comments;
ANALYZE categories;
ANALYZE users;
ANALYZE media;

-- 检查索引使用情况
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_scan DESC;
