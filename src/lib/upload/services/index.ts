/**
 * @fileoverview 上传服务工厂
 * @description 统一导出上传相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { RateLimitConfigService } from './rate-limit-config-service';
import { RateLimitSessionService } from './rate-limit-session-service';
import { RateLimitCheckerService } from './rate-limit-checker-service';

/**
 * 创建速率限制配置服务实例
 */
export const rateLimitConfigService = () => RateLimitConfigService.getInstance();

/**
 * 创建速率限制会话服务实例
 */
export const rateLimitSessionService = () => new RateLimitSessionService();

/**
 * 创建速率限制检查服务实例
 */
export const rateLimitCheckerService = () => new RateLimitCheckerService();

/**
 * 导出所有服务类型
 */
export type {
  UserLevelConfig,
  VIPModeConfig,
} from './rate-limit-config-service';

export type {
  AdvancedUploadSession,
  UserStats,
} from './rate-limit-session-service';

export type {
  RateLimitCheckResult,
} from './rate-limit-checker-service';
