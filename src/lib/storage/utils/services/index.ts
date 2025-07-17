/**
 * @fileoverview 分片上传服务工厂
 * @description 统一导出分片上传相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { StorageManager } from '../../object-storage/storage-manager';
import { MultipartSessionService } from './multipart-session-service';
import { MultipartProcessorService } from './multipart-processor-service';

/**
 * 创建分片会话服务实例
 */
export const multipartSessionService = () => new MultipartSessionService();

/**
 * 创建分片处理服务实例
 */
export const multipartProcessorService = (storageManager: StorageManager) => 
  new MultipartProcessorService(storageManager);

/**
 * 导出所有服务类型
 */
export type {
  MultipartUploadOptions,
  UploadProgress,
  ChunkInfo,
  UploadSession,
} from './multipart-session-service';
