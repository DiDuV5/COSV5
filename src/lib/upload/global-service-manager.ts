/**
 * @fileoverview 全局服务管理器
 * @description 统一管理所有上传相关服务的单例实例，解决重复实例化问题
 * @author Augment AI
 * @date 2025-07-01
 * @version 1.0.0
 */

import { createR2ClientManager } from '@/lib/storage/providers/r2-client-manager';
import { videoProcessingService } from './core/video-processing-service';
import { UnifiedUploadServiceV2 } from './core/unified-upload-service-v2';
import { unifiedMemoryMonitoring } from '@/lib/monitoring/unified-memory-monitoring';

/**
 * 全局服务注册表
 * 确保所有服务都是真正的单例
 */
class GlobalServiceManager {
  private static instance: GlobalServiceManager;
  private services = new Map<string, any>();
  private initPromises = new Map<string, Promise<any>>();

  private constructor() {
    // 设置进程监听器限制，防止泄漏
    process.setMaxListeners(10);

    // 注册清理函数
    this.registerCleanup();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): GlobalServiceManager {
    if (!GlobalServiceManager.instance) {
      GlobalServiceManager.instance = new GlobalServiceManager();
    }
    return GlobalServiceManager.instance;
  }

  /**
   * 获取或创建服务实例
   */
  public async getService<T>(
    key: string,
    factory: () => T | Promise<T>
  ): Promise<T> {
    // 如果服务已存在，直接返回
    if (this.services.has(key)) {
      return this.services.get(key);
    }

    // 如果正在初始化，等待初始化完成
    if (this.initPromises.has(key)) {
      return await this.initPromises.get(key);
    }

    // 创建初始化Promise
    const initPromise = (async () => {
      console.log(`🔧 创建全局服务: ${key}`);
      const service = await factory();
      this.services.set(key, service);
      this.initPromises.delete(key);
      return service;
    })();

    this.initPromises.set(key, initPromise);
    return await initPromise;
  }

  /**
   * 获取R2客户端管理器
   */
  public async getR2ClientManager() {
    return this.getService('r2-client-manager', async () => {
      const config = {
        provider: 'cloudflare-r2' as const,
        region: 'auto',
        endpoint: process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT || 'https://94c950f250492f9e4b9b79c1276ccfb0.r2.cloudflarestorage.com',
        bucket: process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME || 'cosv5',
        accessKeyId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
        timeout: 300000, // 减少超时时间到5分钟
        forcePathStyle: true,
      };

      const manager = createR2ClientManager(config);
      await manager.initialize();
      return manager;
    });
  }

  /**
   * 获取统一视频处理服务
   */
  public async getVideoProcessingService() {
    return this.getService('video-processing-service', async () => {
      console.log('🔧 创建全局服务: video-processing-service');
      await videoProcessingService.initialize();
      return videoProcessingService;
    });
  }

  /**
   * 获取统一上传服务V2
   */
  public async getUnifiedUploadService() {
    return this.getService('unified-upload-service-v2', async () => {
      console.log('🔧 创建全局服务: unified-upload-service-v2');
      const service = new UnifiedUploadServiceV2();
      await service.initialize();
      return service;
    });
  }

  /**
   * 获取统一内存监控服务
   */
  public getUnifiedMemoryMonitoring() {
    return this.getService('unified-memory-monitoring', () => {
      console.log('🔧 创建全局服务: unified-memory-monitoring');
      return unifiedMemoryMonitoring;
    });
  }

  /**
   * 注册进程清理函数
   */
  private registerCleanup() {
    const cleanup = () => {
      console.log('🧹 清理全局服务管理器');

      // 清理所有服务
      for (const [key, service] of this.services) {
        try {
          if (service && typeof service.cleanup === 'function') {
            service.cleanup();
          }
        } catch (error) {
          console.error(`清理服务 ${key} 失败:`, error);
        }
      }

      this.services.clear();
      this.initPromises.clear();
    };

    // 只注册一次清理函数
    if (process.listenerCount('SIGINT') === 0) {
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);
      process.once('exit', cleanup);
    }
  }

  /**
   * 获取服务统计信息
   */
  public getStats() {
    return {
      totalServices: this.services.size,
      initializingServices: this.initPromises.size,
      serviceKeys: Array.from(this.services.keys()),
    };
  }

  /**
   * 强制清理特定服务
   */
  public clearService(key: string) {
    const service = this.services.get(key);
    if (service && typeof service.cleanup === 'function') {
      service.cleanup();
    }
    this.services.delete(key);
    this.initPromises.delete(key);
    console.log(`🗑️ 清理服务: ${key}`);
  }

  /**
   * 清理所有服务
   */
  public clearAll() {
    for (const key of this.services.keys()) {
      this.clearService(key);
    }
  }
}

/**
 * 导出全局服务管理器实例
 */
export const globalServiceManager = GlobalServiceManager.getInstance();

/**
 * 便捷的服务获取函数
 */
export const getGlobalR2Manager = () => globalServiceManager.getR2ClientManager();
export const getGlobalVideoProcessingService = () => globalServiceManager.getVideoProcessingService();
export const getGlobalUnifiedUploadService = () => globalServiceManager.getUnifiedUploadService();
export const getGlobalMemoryMonitoring = () => globalServiceManager.getUnifiedMemoryMonitoring();
