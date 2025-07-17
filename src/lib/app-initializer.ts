/**
 * @fileoverview 应用初始化器
 * @description 应用启动时的初始化逻辑，包括路径创建、系统检查等
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @/lib/config/paths: 统一路径管理
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { ensureAllDirs, pathManager } from '@/lib/config/paths';
import { redisCacheManager } from '@/lib/cache/redis-cache-manager';
import { TRPCErrorHandler } from '@/lib/errors/trpc-error-handler';
import { turnstileFeatureManager } from '@/lib/security/turnstile-server-config';

/**
 * 应用初始化标志
 */
let isInitialized = false;

/**
 * 初始化应用
 */
export async function initializeApp(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    console.log('🚀 开始初始化应用...');

    // 1. 确保所有必要目录存在
    await ensureAllDirs();
    console.log('✅ 目录结构初始化完成');

    // 2. 输出路径配置信息（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      const config = pathManager.getConfig();
      console.log('📁 路径配置:', {
        uploadsDir: config.uploadsDir,
        mediaDir: config.mediaDir,
        tempDir: config.tempDir,
        chunksDir: config.chunksDir,
      });
    }

    // 3. 验证关键路径的可写性
    await validatePathPermissions();
    console.log('✅ 路径权限验证完成');

    // 4. 初始化缓存系统
    await initializeCacheSystem();
    console.log('✅ 缓存系统初始化完成');

    // 5. 初始化Turnstile功能
    await initializeTurnstileFeatures();
    console.log('✅ Turnstile功能初始化完成');

    isInitialized = true;
    console.log('🎉 应用初始化完成');

  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
    throw error;
  }
}

/**
 * 验证路径权限
 */
async function validatePathPermissions(): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const config = pathManager.getConfig();
  const testPaths = [
    config.uploadsDir,
    config.mediaDir,
    config.tempDir,
    config.chunksDir,
  ];

  const errors: string[] = [];

  for (const testPath of testPaths) {
    try {
      // 尝试创建一个测试文件
      const testFile = path.join(testPath, '.write-test');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      console.log(`✅ 路径权限验证通过: ${testPath}`);
    } catch (error) {
      const errorMessage = `路径 ${testPath} 不可写: ${error instanceof Error ? error.message : error}`;
      console.warn(`⚠️ ${errorMessage}`);
      errors.push(errorMessage);
    }
  }

  // 如果有错误，记录但不阻止应用启动（在开发环境中）
  if (errors.length > 0) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorSummary = `路径权限验证失败:\n${errors.join('\n')}`;

    if (isDevelopment) {
      console.warn(`⚠️ 开发环境路径权限警告:\n${errorSummary}`);
      console.warn('💡 这可能是正常的测试行为，应用将继续运行');
    } else {
      throw new Error(errorSummary);
    }
  }
}

/**
 * 获取初始化状态
 */
export function isAppInitialized(): boolean {
  return isInitialized;
}

/**
 * 初始化缓存系统
 */
async function initializeCacheSystem(): Promise<void> {
  try {
    console.log('🔧 开始初始化缓存系统...');

    // 初始化Redis缓存管理器
    await redisCacheManager.initialize();

    // 检查缓存连接状态
    const isConnected = redisCacheManager.isRedisConnected();
    if (isConnected) {
      console.log('✅ Redis缓存连接成功');

      // 执行缓存预热
      await performCacheWarmup();

      // 启动自动优化
      await redisCacheManager.autoOptimize();

    } else {
      console.warn('⚠️ Redis缓存连接失败，将使用内存缓存作为回退');
    }

  } catch (error) {
    console.error('缓存系统初始化失败:', error);
    throw TRPCErrorHandler.internalError(
      '缓存系统初始化失败，请检查Redis连接配置'
    );
  }
}

/**
 * 初始化Turnstile功能
 */
async function initializeTurnstileFeatures(): Promise<void> {
  try {
    console.log('🔧 开始初始化Turnstile功能...');

    // 检查是否已经初始化
    if (turnstileFeatureManager.isInitialized()) {
      console.log('ℹ️ Turnstile功能已初始化，跳过');
      return;
    }

    // 执行Turnstile功能初始化
    await turnstileFeatureManager.initialize();

    // 验证初始化结果
    const allStates = await turnstileFeatureManager.getAllFeatureStates();
    const enabledCount = Object.values(allStates).filter(enabled => enabled).length;
    const totalCount = Object.keys(allStates).length;

    console.log(`✅ Turnstile功能初始化成功: ${totalCount}个功能，${enabledCount}个已启用`);

  } catch (error) {
    console.error('Turnstile功能初始化失败:', error);

    // Turnstile初始化失败不应该阻止应用启动
    // 但需要记录错误以便后续排查
    console.warn('⚠️ Turnstile功能初始化失败，应用将继续运行但Turnstile功能可能不可用');

    // 在开发环境中抛出错误，生产环境中继续运行
    if (process.env.NODE_ENV === 'development') {
      throw TRPCErrorHandler.internalError(
        'Turnstile功能初始化失败，请检查数据库连接和配置'
      );
    }
  }
}

/**
 * 执行缓存预热
 */
async function performCacheWarmup(): Promise<void> {
  try {
    console.log('🔥 开始缓存预热...');

    // 扩大缓存预热范围，提高命中率
    const warmupKeys = [
      // 系统配置缓存
      'system:config',
      'system:health',
      'system:stats',

      // 用户权限模板缓存
      'user:permissions:template',
      'user:permissions:levels',

      // 内容分类缓存
      'content:categories',
      'content:tags:popular',
      'content:posts:hot',

      // 性能监控缓存
      'performance:metrics',
      'performance:database:stats',
      'performance:redis:stats',

      // 常用查询缓存
      'posts:trending:24h',
      'posts:popular:week',
      'users:active:count',

      // API响应缓存
      'api:permissions:stats',
      'api:performance:realtime'
    ];

    await redisCacheManager.warmupCache({
      keys: warmupKeys,
      dataLoader: async (key: string) => {
        // 根据键类型返回优化的预热数据
        switch (true) {
          case key.includes('config'):
            return { initialized: true, timestamp: Date.now(), version: '1.0' };
          case key.includes('permissions'):
            return {
              defaultLevel: 'USER',
              permissions: ['read', 'comment'],
              levels: ['GUEST', 'USER', 'VIP', 'CREATOR', 'ADMIN', 'SUPER_ADMIN']
            };
          case key.includes('categories'):
            return [
              { id: 'general', name: '综合', count: 0 },
              { id: 'cosplay', name: 'Cosplay', count: 0 },
              { id: 'photography', name: '摄影', count: 0 }
            ];
          case key.includes('health'):
            return { status: 'healthy', timestamp: Date.now(), uptime: Date.now() };
          case key.includes('stats'):
            return {
              users: 0, posts: 0, comments: 0,
              timestamp: Date.now(), cached: true
            };
          case key.includes('trending') || key.includes('popular') || key.includes('hot'):
            return { items: [], timestamp: Date.now(), cached: true };
          case key.includes('performance'):
            return {
              status: 'good',
              timestamp: Date.now(),
              metrics: { cpu: 0, memory: 0, db: 0 }
            };
          case key.includes('api:'):
            return {
              data: null,
              timestamp: Date.now(),
              cached: true,
              status: 'ready'
            };
          default:
            return { cached: true, timestamp: Date.now() };
        }
      },
      ttl: 1800 // 减少到30分钟，提高缓存更新频率
    });

    console.log('✅ 缓存预热完成');
  } catch (error) {
    console.warn('⚠️ 缓存预热失败:', error);
    // 预热失败不应该阻止应用启动
  }
}

/**
 * 重置初始化状态（用于测试）
 */
export function resetInitialization(): void {
  isInitialized = false;
}

/**
 * 获取缓存系统状态
 */
export function getCacheSystemStatus() {
  return {
    isConnected: redisCacheManager.isRedisConnected(),
    stats: redisCacheManager.getStats(),
    timestamp: new Date().toISOString()
  };
}

// 应用初始化现在由全局服务管理器统一管理
// 不再在模块级别自动初始化
