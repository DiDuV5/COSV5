/**
 * @fileoverview 认证验证辅助函数
 * @description 提供认证相关的验证和检查功能
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { validateUsername, validatePassword, isForbiddenUsername, getForbiddenUsernameReason, isAdminEmail } from "@/lib/security";
import type { AuthSettings } from "./types";

/**
 * 检查是否启用邮箱验证
 * 优先级：环境变量 > 数据库设置 > 默认值(false)
 */
export async function isEmailVerificationEnabled(prisma: any): Promise<boolean> {
  try {
    // 1. 优先检查环境变量（遵循12-Factor App原则）
    const envValue = process.env.COSEREEDEN_ENABLE_EMAIL_VERIFICATION;
    if (envValue !== undefined) {
      const enabled = envValue.toLowerCase() === 'true';
      console.log('📧 邮箱验证配置（环境变量）:', {
        source: 'environment',
        value: envValue,
        enabled
      });
      return enabled;
    }

    // 2. 检查数据库设置
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'auth.enable_email_verification' },
    });

    if (setting) {
      try {
        const enabled = JSON.parse(setting.value) === true;
        console.log('📧 邮箱验证配置（数据库）:', {
          source: 'database',
          value: setting.value,
          enabled
        });
        return enabled;
      } catch {
        console.warn('⚠️ 数据库中的邮箱验证设置格式错误:', setting.value);
        return false;
      }
    }

    // 3. 默认值
    console.log('📧 邮箱验证配置（默认）:', {
      source: 'default',
      enabled: false
    });
    return false;
  } catch (error) {
    console.error('❌ 检查邮箱验证配置失败:', error);
    return false;
  }
}

/**
 * 获取认证设置
 */
export async function getAuthSettings(prisma: any): Promise<AuthSettings> {
  const authSettings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          "auth.username_min_length",
          "auth.password_min_length",
          "auth.password_require_uppercase",
          "auth.password_require_lowercase",
          "auth.password_require_numbers",
          "auth.password_require_symbols",
        ],
      },
    },
  });

  const settingsMap = authSettings.reduce((acc: Record<string, any>, setting: any) => {
    try {
      acc[setting.key] = JSON.parse(setting.value);
    } catch {
      acc[setting.key] = setting.value;
    }
    return acc;
  }, {});

  return {
    usernameMinLength: settingsMap["auth.username_min_length"] ?? 5,
    passwordMinLength: settingsMap["auth.password_min_length"] ?? 6,
    passwordRequireUppercase: settingsMap["auth.password_require_uppercase"] ?? false,
    passwordRequireLowercase: settingsMap["auth.password_require_lowercase"] ?? false,
    passwordRequireNumbers: settingsMap["auth.password_require_numbers"] ?? false,
    passwordRequireSymbols: settingsMap["auth.password_require_symbols"] ?? false,
  };
}

/**
 * 验证用户名可用性
 */
export async function validateUsernameAvailability(
  prisma: any,
  username: string,
  minLength?: number
): Promise<{ available: boolean; message: string }> {
  // 获取系统设置中的用户名最小长度
  const usernameMinLength = minLength ?? await getUsernameMinLength(prisma);

  // 首先检查用户名格式和安全性
  const validation = validateUsername(username, usernameMinLength);
  if (!validation.isValid) {
    return {
      available: false,
      message: validation.error || "用户名不符合规范",
    };
  }

  // 检查是否被禁止注册
  if (isForbiddenUsername(username)) {
    return {
      available: false,
      message: getForbiddenUsernameReason(username),
    };
  }

  // 检查数据库中是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  return {
    available: !existingUser,
    message: existingUser ? "用户名已被使用" : "用户名可用",
  };
}

/**
 * 验证邮箱可用性
 */
export async function validateEmailAvailability(
  prisma: any,
  email: string
): Promise<{ available: boolean; message: string }> {
  // 使用 findFirst 而不是 findUnique，因为 email 字段不是唯一索引
  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });

  return {
    available: !existingUser,
    message: existingUser ? "邮箱已被使用" : "邮箱可用",
  };
}

/**
 * 获取用户名最小长度设置
 */
export async function getUsernameMinLength(prisma: any): Promise<number> {
  const usernameSetting = await prisma.systemSetting.findUnique({
    where: { key: "auth.username_min_length" },
  });
  return usernameSetting ? parseInt(JSON.parse(usernameSetting.value)) : 5;
}

/**
 * 验证注册输入数据
 */
export async function validateRegistrationInput(
  prisma: any,
  input: {
    username: string;
    email?: string;
    password: string;
    displayName: string;
  }
): Promise<void> {
  const { username, email, password } = input;

  // 获取认证设置
  const settings = await getAuthSettings(prisma);

  // 1. 验证用户名安全性和格式
  const usernameValidation = validateUsername(username, settings.usernameMinLength);
  if (!usernameValidation.isValid) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      usernameValidation.error || "用户名不符合规范"
    );
  }

  // 2. 检查用户名是否被禁止注册
  if (isForbiddenUsername(username)) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      getForbiddenUsernameReason(username)
    );
  }

  // 3. 验证密码强度
  const passwordValidation = validatePassword(password, {
    minLength: settings.passwordMinLength,
    requireUppercase: settings.passwordRequireUppercase,
    requireLowercase: settings.passwordRequireLowercase,
    requireNumbers: settings.passwordRequireNumbers,
    requireSymbols: settings.passwordRequireSymbols,
  });
  if (!passwordValidation.isValid) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      passwordValidation.error || "密码不符合要求"
    );
  }

  // 4. 检查用户名和邮箱是否已存在
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (existingUser) {
    if (existingUser.username === username) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.RESOURCE_EXISTS,
        "用户名已存在"
      );
    }
    if (existingUser.email === email) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.RESOURCE_EXISTS,
        "邮箱已被使用"
      );
    }
  }

  // 检查是否启用邮箱验证
  const emailVerificationEnabled = await isEmailVerificationEnabled(prisma);

  // 如果启用邮箱验证但没有提供邮箱，则报错
  if (emailVerificationEnabled && !email) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      "系统已启用邮箱验证，注册时必须提供邮箱地址"
    );
  }
}

/**
 * 检查是否为管理员用户
 */
export function isAdminUser(username: string, email?: string): boolean {
  const isAdminByEmail = email && isAdminEmail(email);
  const isAdminByUsername = username === 'douyu'; // 预设管理员用户名
  return isAdminByEmail || isAdminByUsername;
}

/**
 * 验证Telegram数据完整性
 */
export function validateTelegramAuthData(input: any): Record<string, any> {
  const { hash, ...authData } = input;

  // 过滤掉空值、undefined值和空字符串
  const filteredAuthData = Object.fromEntries(
    Object.entries(authData).filter(([_, value]) =>
      value !== undefined &&
      value !== null &&
      value !== "" &&
      String(value).trim() !== ""
    )
  );

  if (Object.keys(filteredAuthData).length === 0) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      "Telegram认证数据无效",
      { context: { input } }
    );
  }

  return filteredAuthData;
}

/**
 * 验证认证时间
 */
export function validateAuthTime(authDate: string): void {
  const authTime = parseInt(authDate) * 1000;
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24小时

  if (isNaN(authTime) || authTime <= 0) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      "无效的认证时间"
    );
  }

  if (now - authTime > maxAge) {
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      "认证数据已过期，请重新登录"
    );
  }

  // 检查认证时间是否在未来（防止时间篡改）
  if (authTime > now + 5 * 60 * 1000) { // 允许5分钟的时间偏差
    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INVALID_INPUT,
      "认证时间异常"
    );
  }
}
