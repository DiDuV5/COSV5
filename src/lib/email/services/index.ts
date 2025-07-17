/**
 * @fileoverview 邮件服务工厂
 * @description 统一导出邮件相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import { EmailConfigService } from './email-config-service';
import { EmailTransportService } from './email-transport-service';
import { EmailTemplateService } from './email-template-service';

/**
 * 创建邮件配置服务实例
 */
export const emailConfigService = () => EmailConfigService;

/**
 * 创建邮件传输服务实例
 */
export const emailTransportService = () => EmailTransportService;

/**
 * 创建邮件模板服务实例
 */
export const emailTemplateService = () => EmailTemplateService;

/**
 * 导出所有服务类型
 */
export type {
  EmailConfig,
  EmailProvider,
} from './email-config-service';

export type {
  SendEmailOptions,
  SendResult,
} from './email-transport-service';

// 类型和枚举已在 email-template-service.ts 中直接导出
