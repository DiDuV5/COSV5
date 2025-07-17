/**
 * @fileoverview 用户审批配置处理器
 * @description 处理用户审批系统的配置管理
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import type { ApprovalConfig } from './types';
import { parseApprovalConfig, createConfigUpdates, createAuditLogData, getClientIpAddress, getUserAgent } from './utils';

/**
 * 获取审批配置
 */
export async function getApprovalConfiguration(db: any): Promise<ApprovalConfig> {
  const settings = await db.systemSetting.findMany({
    where: {
      key: {
        in: [
          "user_registration_approval_enabled",
          "user_approval_notification_enabled",
          "user_approval_auto_approve_admin",
        ],
      },
    },
  });

  return parseApprovalConfig(settings);
}

/**
 * 更新审批配置
 */
export async function updateApprovalConfiguration(
  db: any,
  req: any,
  input: Partial<ApprovalConfig>,
  adminId: string
): Promise<{ success: boolean; message: string }> {
  const updates = createConfigUpdates(input);

  if (updates.length === 0) {
    return {
      success: true,
      message: "没有需要更新的配置项",
    };
  }

  // 批量更新配置
  await Promise.all(
    updates.map((update) =>
      db.systemSetting.upsert({
        where: { key: update.key },
        update: { value: update.value },
        create: {
          key: update.key,
          value: update.value,
          category: "user_management",
          isPublic: false,
        },
      })
    )
  );

  // 记录审计日志
  const auditLogData = createAuditLogData(
    adminId,
    "UPDATE_APPROVAL_CONFIG",
    "更新用户审核配置",
    input,
    "system_settings",
    getClientIpAddress(req),
    getUserAgent(req)
  );

  await db.auditLog.create({ data: auditLogData });

  return {
    success: true,
    message: "审核配置更新成功",
  };
}

/**
 * 获取系统设置的默认值
 */
export function getDefaultApprovalConfig(): ApprovalConfig {
  return {
    registrationApprovalEnabled: false,
    notificationEnabled: true,
    autoApproveAdmin: true,
    timeoutHours: 72,
    autoRejectTimeout: false,
    batchSizeLimit: 50,
  };
}

/**
 * 验证配置更新权限
 */
export function validateConfigUpdatePermission(userLevel: string): void {
  const allowedLevels = ['ADMIN', 'SUPER_ADMIN'];
  if (!allowedLevels.includes(userLevel)) {
    throw new Error(`用户权限不足，需要 ${allowedLevels.join(' 或 ')} 权限`);
  }
}

/**
 * 获取配置变更历史
 */
export async function getConfigChangeHistory(
  db: any,
  limit: number = 50
): Promise<Array<{
  id: string;
  userId: string;
  action: string;
  message: string;
  details: any;
  createdAt: Date;
  user: {
    username: string;
    displayName: string | null;
  };
}>> {
  return await db.auditLog.findMany({
    where: {
      action: "UPDATE_APPROVAL_CONFIG",
      resource: "system_settings",
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });
}

/**
 * 重置配置为默认值
 */
export async function resetApprovalConfigToDefaults(
  db: any,
  req: any,
  adminId: string
): Promise<{ success: boolean; message: string }> {
  const defaultConfig = getDefaultApprovalConfig();

  return await updateApprovalConfiguration(db, req, defaultConfig, adminId);
}

/**
 * 验证配置值的有效性
 */
export function validateConfigValues(config: Partial<ApprovalConfig>): void {
  // 验证布尔值
  const booleanFields = ['registrationApprovalEnabled', 'notificationEnabled', 'autoApproveAdmin'];

  for (const field of booleanFields) {
    if (config[field as keyof ApprovalConfig] !== undefined) {
      const value = config[field as keyof ApprovalConfig];
      if (typeof value !== 'boolean') {
        throw new Error(`配置项 ${field} 必须是布尔值`);
      }
    }
  }
}

/**
 * 获取配置项的描述信息
 */
export function getConfigDescriptions(): Record<keyof ApprovalConfig, string> {
  return {
    registrationApprovalEnabled: "是否启用用户注册审核",
    notificationEnabled: "是否启用审核通知",
    autoApproveAdmin: "是否自动审核通过管理员账户",
    timeoutHours: "审批超时时间（小时）",
    autoRejectTimeout: "是否自动拒绝超时申请",
    batchSizeLimit: "批量操作大小限制",
  };
}

/**
 * 导出配置为JSON格式
 */
export async function exportApprovalConfig(db: any): Promise<{
  config: ApprovalConfig;
  exportedAt: string;
  version: string;
}> {
  const config = await getApprovalConfiguration(db);

  return {
    config,
    exportedAt: new Date().toISOString(),
    version: "1.0.0",
  };
}

/**
 * 从JSON导入配置
 */
export async function importApprovalConfig(
  db: any,
  req: any,
  configData: {
    config: ApprovalConfig;
    version?: string;
  },
  adminId: string
): Promise<{ success: boolean; message: string }> {
  // 验证配置格式
  validateConfigValues(configData.config);

  // 更新配置
  const result = await updateApprovalConfiguration(db, req, configData.config, adminId);

  // 记录导入操作
  const auditLogData = createAuditLogData(
    adminId,
    "IMPORT_APPROVAL_CONFIG",
    "导入用户审核配置",
    { version: configData.version, config: configData.config },
    "system_settings",
    getClientIpAddress(req),
    getUserAgent(req)
  );

  await db.auditLog.create({ data: auditLogData });

  return {
    success: result.success,
    message: result.success ? "配置导入成功" : "配置导入失败",
  };
}
