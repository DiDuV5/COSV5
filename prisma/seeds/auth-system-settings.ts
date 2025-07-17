/**
 * @fileoverview 认证系统设置种子数据
 * @description 初始化用户名和密码策略的系统设置
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @prisma/client: ^5.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 初始化认证系统设置
 */
export async function seedAuthSystemSettings() {
  console.log("🔐 初始化认证系统设置...");

  const authSettings = [
    // 用户名策略设置
    {
      key: "auth.username_min_length",
      value: JSON.stringify(5),
      description: "用户名最小长度",
      category: "auth",
      isPublic: true,
    },

    // 密码策略设置
    {
      key: "auth.password_min_length",
      value: JSON.stringify(6),
      description: "密码最小长度",
      category: "auth",
      isPublic: true,
    },
    {
      key: "auth.password_require_uppercase",
      value: JSON.stringify(false),
      description: "密码是否需要大写字母",
      category: "auth",
      isPublic: true,
    },
    {
      key: "auth.password_require_lowercase",
      value: JSON.stringify(false),
      description: "密码是否需要小写字母",
      category: "auth",
      isPublic: true,
    },
    {
      key: "auth.password_require_numbers",
      value: JSON.stringify(false),
      description: "密码是否需要数字",
      category: "auth",
      isPublic: true,
    },
    {
      key: "auth.password_require_symbols",
      value: JSON.stringify(false),
      description: "密码是否需要特殊字符",
      category: "auth",
      isPublic: true,
    },

    // 登录方式设置
    {
      key: "auth.enable_email_verification",
      value: JSON.stringify(false),
      description: "是否启用邮箱验证",
      category: "auth",
      isPublic: true,
    },
    {
      key: "auth.enable_telegram_login",
      value: JSON.stringify(false),
      description: "是否启用 Telegram 登录",
      category: "auth",
      isPublic: true,
    },
    {
      key: "auth.enable_telegram_register",
      value: JSON.stringify(false),
      description: "是否启用 Telegram 注册",
      category: "auth",
      isPublic: true,
    },

    // 页面说明设置
    {
      key: "auth.login_page_notice",
      value: JSON.stringify("当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员"),
      description: "登录页面说明",
      category: "auth",
      isPublic: true,
    },
    {
      key: "auth.register_page_notice",
      value: JSON.stringify("当前仅作为体验测试，所有测试数据会定期清空\n请勿上传重要个人信息或敏感内容\n如有问题请联系管理员"),
      description: "注册页面说明",
      category: "auth",
      isPublic: true,
    },
  ];

  for (const setting of authSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        description: setting.description,
        category: setting.category,
        isPublic: setting.isPublic,
      },
      create: setting,
    });
    console.log(`✅ 初始化设置: ${setting.key} = ${setting.value}`);
  }

  console.log("🔐 认证系统设置初始化完成");
}

/**
 * 更新认证系统设置为推荐的生产环境配置
 */
export async function updateAuthSettingsForProduction() {
  console.log("🔐 更新认证系统设置为生产环境配置...");

  const productionSettings = [
    // 更严格的用户名要求
    {
      key: "auth.username_min_length",
      value: JSON.stringify(5),
      description: "用户名最小长度（支持管理员用户名douyu）",
    },

    // 更严格的密码策略
    {
      key: "auth.password_min_length",
      value: JSON.stringify(8),
      description: "密码最小长度（生产环境推荐8个字符）",
    },
    {
      key: "auth.password_require_uppercase",
      value: JSON.stringify(true),
      description: "密码必须包含大写字母（生产环境推荐启用）",
    },
    {
      key: "auth.password_require_lowercase",
      value: JSON.stringify(true),
      description: "密码必须包含小写字母（生产环境推荐启用）",
    },
    {
      key: "auth.password_require_numbers",
      value: JSON.stringify(true),
      description: "密码必须包含数字（生产环境推荐启用）",
    },
    {
      key: "auth.password_require_symbols",
      value: JSON.stringify(false),
      description: "密码是否需要特殊字符（可选）",
    },

    // 启用邮箱验证
    {
      key: "auth.enable_email_verification",
      value: JSON.stringify(true),
      description: "启用邮箱验证（生产环境推荐启用）",
    },
  ];

  for (const setting of productionSettings) {
    await prisma.systemSetting.update({
      where: { key: setting.key },
      data: {
        value: setting.value,
        description: setting.description,
      },
    });
    console.log(`✅ 更新生产设置: ${setting.key} = ${setting.value}`);
  }

  console.log("🔐 认证系统设置已更新为生产环境配置");
}

/**
 * 主函数 - 运行认证系统设置初始化
 */
async function main() {
  try {
    await seedAuthSystemSettings();
  } catch (error) {
    console.error('❌ 认证系统设置初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本，则执行main函数
if (require.main === module) {
  main();
}
