/**
 * @fileoverview 用户注册相关功能
 * @description 处理用户注册逻辑
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import * as bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { TRPCErrorHandler, BusinessErrorType } from "@/lib/errors/trpc-error-handler";
import { EmailService } from "@/lib/email";
import { determineApprovalStatus } from "@/lib/user-approval-helper";
import { sendRegistrationSubmittedNotification } from "@/lib/approval-notification";
import { validateRegistrationInput, isEmailVerificationEnabled, isAdminUser } from "./validation-helpers";
import { cleanPasswordSpaces } from "@/lib/password-utils";
import type { UserRegistrationResult } from "./types";

/**
 * 处理用户注册
 */
export async function processUserRegistration(
  prisma: any,
  input: {
    username: string;
    email?: string;
    password: string;
    displayName: string;
  }
): Promise<UserRegistrationResult> {
  const { username, email, displayName } = input;

  // 清理密码空格
  const password = cleanPasswordSpaces(input.password);

  // 验证输入数据
  await validateRegistrationInput(prisma, input);

  // 检查是否为管理员用户
  const isAdmin = isAdminUser(username, email);

  // 使用事务确保数据一致性，增强并发安全性
  const result = await prisma.$transaction(async (tx: any) => {
    // 1. 使用原子性检查防止竞态条件
    // 分别检查用户名和邮箱，使用更严格的查询
    const [existingUsername, existingEmail] = await Promise.all([
      // 检查用户名唯一性
      tx.user.findFirst({
        where: { username },
        select: { id: true, username: true, registrationStatus: true },
      }),
      // 检查邮箱唯一性（如果提供了邮箱）
      email ? tx.user.findFirst({
        where: {
          email,
          registrationStatus: "COMPLETED"
        },
        select: { id: true, email: true, registrationStatus: true },
      }) : null,
    ]);

    // 2. 检查冲突并抛出具体错误
    if (existingUsername) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.RESOURCE_EXISTS,
        "用户名已被使用"
      );
    }

    if (existingEmail) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.RESOURCE_EXISTS,
        "邮箱已被使用"
      );
    }

    // 3. 安全清理未完成的注册记录，防止数据不一致
    if (email) {
      // 记录清理操作用于审计
      const incompleteRecords = await tx.user.findMany({
        where: {
          email,
          registrationStatus: {
            in: ["PENDING_EMAIL", "FAILED"]
          }
        },
        select: { id: true, username: true, registrationStatus: true, createdAt: true }
      });

      if (incompleteRecords.length > 0) {
        console.log(`[REGISTRATION] Cleaning ${incompleteRecords.length} incomplete records for email: ${email}`);

        // 安全删除未完成的记录
        await tx.user.deleteMany({
          where: {
            email,
            registrationStatus: {
              in: ["PENDING_EMAIL", "FAILED"]
            }
          }
        });
      }
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 12);

    // 确定用户等级和审核状态
    const userLevel = isAdmin ? "ADMIN" : "USER";
    const approvalStatus = await determineApprovalStatus(userLevel, isAdmin);
    const emailVerificationEnabled = await isEmailVerificationEnabled(tx);

    // 确定初始注册状态
    const initialRegistrationStatus = (emailVerificationEnabled && email && !isAdmin)
      ? "PENDING_EMAIL"
      : "COMPLETED";

    // 创建用户
    const user = await tx.user.create({
      data: {
        username,
        email,
        passwordHash,
        displayName,
        userLevel,
        isActive: true,
        isVerified: isAdmin || !emailVerificationEnabled, // 管理员自动验证，或根据邮箱验证设置
        canPublish: Boolean(isAdmin), // 管理员默认有发布权限
        approvalStatus,
        approvedAt: approvalStatus === "APPROVED" ? new Date() : null,
        approvedBy: approvalStatus === "APPROVED" && isAdmin ? "system" : null,
        registrationStatus: initialRegistrationStatus,
        emailSendAttempts: 0,
        lastEmailSentAt: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        userLevel: true,
        isVerified: true,
        canPublish: true,
        approvalStatus: true,
        createdAt: true,
      },
    });

    // 创建用户罐头账户
    await tx.userCansAccount.create({
      data: {
        userId: user.id,
        totalCans: 0,
        availableCans: 0,
        frozenCans: 0,
        totalExperience: 0,
        dailyExperienceEarned: 0,
        dailyExperienceLimit: 100,
        totalCheckins: 0,
        consecutiveCheckins: 0,
      },
    });

    return user;
  });

  // 处理邮箱验证
  const emailVerificationEnabled = await isEmailVerificationEnabled(prisma);
  if (emailVerificationEnabled && email) {
    const emailResult = await handleEmailVerification(prisma, email, username, result.id);
    if (!emailResult.success) {
      // 邮件发送失败，更新用户状态为FAILED，释放邮箱
      await prisma.user.update({
        where: { id: result.id },
        data: {
          registrationStatus: "FAILED",
          emailSendAttempts: emailResult.attempts || 1,
          lastEmailSentAt: new Date(),
        }
      });

      // 确保返回完整的 UserRegistrationResult 结构
      const registrationResult: UserRegistrationResult = {
        success: true, // 注册本身成功，只是邮件发送失败
        message: emailResult.message + " 您可以稍后重新使用此邮箱注册。",
        user: result,
        requiresEmailVerification: true,
        emailSent: false,
        canRetryRegistration: true, // 新增字段，表示可以重新注册
      };
      return registrationResult;
    }

    // 邮件发送成功，更新用户状态
    await prisma.user.update({
      where: { id: result.id },
      data: {
        registrationStatus: "COMPLETED",
        emailSendAttempts: (emailResult.attempts || 1),
        lastEmailSentAt: new Date(),
      }
    });

    console.log(`用户注册: ${result.username}, 邮箱: ${result.email}, 验证邮件已发送`);

    // 确保返回完整的 UserRegistrationResult 结构
    const registrationResult: UserRegistrationResult = {
      success: true,
      message: "注册成功，请检查您的邮箱并点击验证链接完成注册",
      user: result,
      requiresEmailVerification: true,
      emailSent: true,
    };
    return registrationResult;
  }

  // 记录注册日志
  logRegistration(result, isAdmin);

  // 发送审核通知（如果需要审核）
  if (result.approvalStatus === "PENDING" && !isAdmin) {
    await sendApprovalNotification(result);
  }

  // 根据审核状态返回不同的消息
  const message = getRegistrationMessage(result, isAdmin);

  // 确保返回完整的 UserRegistrationResult 结构
  const registrationResult: UserRegistrationResult = {
    success: true,
    message,
    user: result,
    requiresEmailVerification: false,
    requiresApproval: result.approvalStatus === "PENDING",
  };
  return registrationResult;
}

/**
 * 处理邮箱验证
 */
async function handleEmailVerification(
  prisma: any,
  email: string,
  username: string,
  userId?: string
): Promise<{ success: boolean; message: string; userMessage?: string; attempts?: number }> {
  try {
    // 生成验证令牌（使用UUID格式以保持一致性）
    const verificationToken = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    // 🔑 UUID生成日志
    console.log('🔑 UUID令牌生成:', {
      uuid: verificationToken,
      email,
      username,
      length: verificationToken.length,
      format: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(verificationToken),
      expiresAt: expiresAt.toISOString()
    });

    // 保存验证令牌
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: expiresAt,
      },
    });

    console.log('💾 UUID令牌存储成功:', { email, token: verificationToken });

    // 构建完整的验证URL（遵循12-Factor App原则）
    const { generateVerificationUrl } = await import('@/lib/config/url-config');
    const verificationUrl = generateVerificationUrl(verificationToken);

    // 🔗 URL生成日志
    console.log('🔗 验证URL生成:', {
      token: verificationToken,
      url: verificationUrl,
      urlLength: verificationUrl.length,
      containsToken: verificationUrl.includes(verificationToken)
    });

    // 发送验证邮件（使用详细版本获取错误信息）
    const emailResult = await EmailService.sendVerificationEmailDetailed(email, username, verificationUrl);

    // 📧 邮件发送结果日志
    console.log('📧 验证邮件发送结果:', {
      success: emailResult.success,
      email,
      token: verificationToken,
      messageId: emailResult.messageId,
      attempts: emailResult.attempts
    });

    if (!emailResult.success) {
      console.error(`❌ 验证邮件发送失败: ${email}`, {
        token: verificationToken,
        url: verificationUrl,
        errorType: emailResult.error?.type,
        userMessage: emailResult.userMessage,
        shouldRetry: emailResult.shouldRetry,
        attempts: emailResult.attempts,
      });

      // 根据错误类型生成不同的用户提示
      let userMessage = "注册成功，但验证邮件发送失败。";

      if (emailResult.error?.type === 'INVALID_EMAIL_FORMAT' ||
        emailResult.error?.type === 'EMAIL_NOT_EXISTS') {
        userMessage += "邮箱地址可能无效。请在个人设置中更新邮箱地址";
      } else if (emailResult.shouldRetry) {
        userMessage += "请稍后在个人设置中重新发送验证邮件，或联系运营 (https://t.me/CoserYYbot)";
      } else {
        userMessage += "请联系运营 (https://t.me/CoserYYbot)";
      }

      return {
        success: false,
        message: userMessage,
        userMessage: userMessage,
        attempts: emailResult.attempts || 1,
      };
    }

    // ✅ 邮件发送成功日志
    console.log('✅ 验证邮件发送成功:', {
      email,
      token: verificationToken,
      messageId: emailResult.messageId,
      url: verificationUrl
    });

    return {
      success: true,
      message: emailResult.userMessage || "验证邮件已发送到您的邮箱，请注意检查垃圾邮件"
    };
  } catch (error) {
    // 结构化日志记录
    console.error('发送验证邮件过程中出错:', {
      email: email,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      message: "注册成功，但验证邮件发送过程中出现错误。请稍后在个人设置中重新发送验证邮件，或联系管理员",
      userMessage: "注册成功，但验证邮件发送过程中出现错误。请稍后在个人设置中重新发送验证邮件，或联系管理员",
      attempts: 1,
    };
  }
}

/**
 * 发送审核通知
 */
async function sendApprovalNotification(user: any): Promise<void> {
  try {
    await sendRegistrationSubmittedNotification({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
    });
    console.log(`邮箱注册申请通知已发送: ${user.username}`);
  } catch (error) {
    // 结构化日志记录
    console.error(`发送邮箱注册申请通知失败:`, {
      userId: user.id,
      username: user.username,
      email: user.email,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    // 不抛出错误，避免影响注册流程
  }
}

/**
 * 记录注册日志
 */
function logRegistration(user: any, isAdmin: boolean): void {
  if (isAdmin) {
    const adminType = user.username === 'douyu' ? '预设管理员用户名' : '管理员邮箱';
    console.log(`🔑 管理员账号注册 (${adminType}): ${user.username}, 邮箱: ${user.email}, 用户等级: ${user.userLevel}, 审核状态: ${user.approvalStatus}`);
  } else {
    console.log(`👤 用户注册: ${user.username}, 邮箱: ${user.email || '未提供'}, 用户等级: ${user.userLevel}, 审核状态: ${user.approvalStatus}`);
  }
}

/**
 * 获取注册消息
 */
function getRegistrationMessage(user: any, isAdmin: boolean): string {
  if (isAdmin) {
    return "管理员账号注册成功";
  } else if (user.approvalStatus === "PENDING") {
    return "注册成功，您的账号正在等待管理员审核，审核通过后即可正常使用平台功能";
  } else {
    return "注册成功";
  }
}

/**
 * 重新发送验证邮件
 */
export async function resendVerificationEmail(
  prisma: any,
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 查找需要验证邮件的用户
    const user = await prisma.user.findFirst({
      where: {
        email,
        registrationStatus: {
          in: ["PENDING_EMAIL", "FAILED"]
        },
        isVerified: false,
      },
      select: {
        id: true,
        username: true,
        email: true,
        registrationStatus: true,
        emailSendAttempts: true,
        lastEmailSentAt: true,
      }
    });

    if (!user) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.RESOURCE_NOT_FOUND,
        "未找到需要验证邮件的用户记录，或该邮箱已完成验证"
      );
    }

    // 检查发送频率限制（5分钟内只能发送一次）
    if (user.lastEmailSentAt) {
      const timeSinceLastSend = Date.now() - user.lastEmailSentAt.getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (timeSinceLastSend < fiveMinutes) {
        const remainingTime = Math.ceil((fiveMinutes - timeSinceLastSend) / 1000 / 60);
        throw TRPCErrorHandler.businessError(
          BusinessErrorType.RATE_LIMIT_EXCEEDED,
          `请等待 ${remainingTime} 分钟后再重新发送验证邮件`
        );
      }
    }

    // 检查发送次数限制（最多5次）
    if (user.emailSendAttempts >= 5) {
      throw TRPCErrorHandler.businessError(
        BusinessErrorType.RATE_LIMIT_EXCEEDED,
        "验证邮件发送次数已达上限，请联系运营 (https://t.me/CoserYYbot)"
      );
    }

    // 重新发送验证邮件
    const emailResult = await handleEmailVerification(prisma, email, user.username, user.id);

    if (emailResult.success) {
      // 更新用户状态
      await prisma.user.update({
        where: { id: user.id },
        data: {
          registrationStatus: "COMPLETED",
          emailSendAttempts: user.emailSendAttempts + 1,
          lastEmailSentAt: new Date(),
        }
      });

      return {
        success: true,
        message: "验证邮件已重新发送，请检查您的邮箱"
      };
    } else {
      // 更新发送尝试次数
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailSendAttempts: user.emailSendAttempts + 1,
          lastEmailSentAt: new Date(),
        }
      });

      return {
        success: false,
        message: emailResult.message || "验证邮件发送失败，请稍后重试"
      };
    }
  } catch (error) {
    // 结构化日志记录
    console.error("重新发送验证邮件失败:", {
      email: email,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    // 检查是否为速率限制错误
    if (error instanceof Error && error.message.includes("RATE_LIMIT_EXCEEDED")) {
      throw error;
    }

    // 如果是已知的业务错误，直接抛出
    if (error instanceof Error && error.name === 'TRPCError') {
      throw error;
    }

    throw TRPCErrorHandler.businessError(
      BusinessErrorType.INTERNAL_ERROR,
      "重新发送验证邮件失败，请稍后重试"
    );
  }
}
