/**
 * @fileoverview 文档模板生成器
 * @description 生成各种配置文档模板
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { 
  DocGenerationConfig, 
  ConfigCategoryDoc, 
  EnvVarDocItem,
  ConfigExample,
  DocumentTemplate 
} from './doc-types';

/**
 * 文档模板生成器
 */
export class TemplateGenerator {
  /**
   * 生成环境变量文档模板
   */
  generateEnvVarTemplate(config: DocGenerationConfig): string[] {
    const content: string[] = [];

    content.push('# CoserEden 环境变量配置文档');
    content.push('');
    content.push(`> 生成时间: ${new Date().toISOString()}`);
    content.push('');
    content.push('本文档详细说明了CoserEden项目的所有环境变量配置。');
    content.push('');

    // 目录
    content.push('## 目录');
    content.push('');
    content.push('- [P0级配置 (关键基础设施)](#p0级配置)');
    content.push('- [P1级配置 (核心功能)](#p1级配置)');
    content.push('- [P2级配置 (重要功能)](#p2级配置)');
    content.push('- [P3级配置 (可选功能)](#p3级配置)');
    if (config.includeExamples) {
      content.push('- [配置示例](#配置示例)');
    }
    if (config.includeSecurity) {
      content.push('- [安全注意事项](#安全注意事项)');
    }
    content.push('');

    // 配置分类
    const categories = this.getConfigCategories();

    for (const category of categories) {
      content.push(`## ${category.name}`);
      content.push('');
      content.push(category.description);
      content.push('');

      for (const variable of category.variables) {
        content.push(`### ${variable.name}`);
        content.push('');
        content.push(`**描述**: ${variable.description}`);
        content.push(`**类型**: ${variable.type}`);
        content.push(`**必需**: ${variable.required ? '是' : '否'}`);
        content.push(`**优先级**: ${variable.priority}`);
        
        if (variable.defaultValue) {
          content.push(`**默认值**: \`${variable.defaultValue}\``);
        }
        
        if (variable.exampleValue && config.includeExamples) {
          content.push(`**示例值**: \`${variable.exampleValue}\``);
        }

        if (variable.securitySensitive) {
          content.push('**⚠️ 安全敏感**: 此配置包含敏感信息，请妥善保管');
        }

        if (variable.validationRules && variable.validationRules.length > 0) {
          content.push('**验证规则**:');
          for (const rule of variable.validationRules) {
            content.push(`- ${rule}`);
          }
        }

        content.push('');
      }
    }

    return content;
  }

  /**
   * 生成最佳实践指南模板
   */
  generateBestPracticesTemplate(): string[] {
    const content: string[] = [];

    content.push('# CoserEden 配置最佳实践指南');
    content.push('');
    content.push(`> 生成时间: ${new Date().toISOString()}`);
    content.push('');

    const practices = [
      {
        title: '环境变量命名规范',
        category: '命名规范',
        doList: [
          '使用 COSEREEDEN_ 前缀',
          '使用大写字母和下划线',
          '使用描述性名称',
          '按功能分组命名'
        ],
        dontList: [
          '使用小写字母',
          '使用特殊字符（除下划线外）',
          '使用过于简短的名称',
          '混合不同的命名风格'
        ]
      },
      {
        title: '安全配置管理',
        category: '安全',
        doList: [
          '使用强密码和复杂密钥',
          '定期轮换敏感配置',
          '使用环境特定的配置文件',
          '限制配置文件的访问权限'
        ],
        dontList: [
          '在代码中硬编码敏感信息',
          '使用弱密码或默认密钥',
          '在版本控制中提交敏感配置',
          '在日志中输出敏感信息'
        ]
      },
      {
        title: '环境配置分离',
        category: '环境管理',
        doList: [
          '为每个环境创建独立的配置',
          '使用配置验证确保完整性',
          '文档化所有配置变更',
          '建立配置审核流程'
        ],
        dontList: [
          '在不同环境间共享敏感配置',
          '跳过配置验证步骤',
          '未记录配置变更',
          '直接在生产环境修改配置'
        ]
      }
    ];

    for (const practice of practices) {
      content.push(`## ${practice.title}`);
      content.push('');
      content.push(`**类别**: ${practice.category}`);
      content.push('');

      content.push('### ✅ 应该做的');
      content.push('');
      for (const item of practice.doList) {
        content.push(`- ${item}`);
      }
      content.push('');

      content.push('### ❌ 不应该做的');
      content.push('');
      for (const item of practice.dontList) {
        content.push(`- ${item}`);
      }
      content.push('');
    }

    return content;
  }

  /**
   * 生成部署检查清单模板
   */
  generateDeploymentChecklistTemplate(): string[] {
    const content: string[] = [];

    content.push('# CoserEden 部署前配置检查清单');
    content.push('');
    content.push(`> 生成时间: ${new Date().toISOString()}`);
    content.push('');
    content.push('在部署CoserEden应用之前，请确保完成以下配置检查：');
    content.push('');

    const checkItems = [
      {
        category: 'P0级配置检查',
        items: [
          '✅ Redis连接配置已设置且可访问',
          '✅ 数据库连接URL已配置且可连接',
          '✅ Cloudflare R2存储凭据已配置',
          '✅ 所有P0级环境变量已设置'
        ]
      },
      {
        category: 'P1级配置检查',
        items: [
          '✅ 邮件服务配置已设置且可发送',
          '✅ NextAuth密钥已生成且足够复杂',
          '✅ 品牌配置已自定义',
          '✅ 所有P1级环境变量已设置'
        ]
      },
      {
        category: '安全配置检查',
        items: [
          '✅ 所有密码和密钥使用强随机值',
          '✅ 生产环境禁用调试模式',
          '✅ HTTPS配置已启用',
          '✅ 安全头配置已设置'
        ]
      },
      {
        category: '性能配置检查',
        items: [
          '✅ 数据库连接池大小已优化',
          '✅ Redis缓存配置已优化',
          '✅ 文件上传限制已设置',
          '✅ 日志级别已配置'
        ]
      }
    ];

    for (const category of checkItems) {
      content.push(`## ${category.category}`);
      content.push('');
      for (const item of category.items) {
        content.push(`- [ ] ${item.replace('✅ ', '')}`);
      }
      content.push('');
    }

    content.push('## 验证命令');
    content.push('');
    content.push('```bash');
    content.push('# 检查配置完整性');
    content.push('npm run config:validate');
    content.push('');
    content.push('# 测试数据库连接');
    content.push('npm run db:test');
    content.push('');
    content.push('# 测试Redis连接');
    content.push('npm run redis:test');
    content.push('');
    content.push('# 测试存储连接');
    content.push('npm run storage:test');
    content.push('```');

    return content;
  }

  /**
   * 获取配置分类
   */
  private getConfigCategories(): ConfigCategoryDoc[] {
    return [
      {
        name: 'P0级配置 (关键基础设施)',
        description: '这些配置对系统运行至关重要，缺少任何一项都会导致系统无法正常启动。',
        priority: 'P0',
        variables: [
          {
            name: 'COSEREEDEN_REDIS_HOST',
            description: 'Redis服务器主机地址',
            type: 'string',
            required: true,
            defaultValue: 'localhost',
            exampleValue: 'redis.example.com',
            category: 'redis',
            priority: 'P0',
            securitySensitive: false,
            validationRules: ['必须是有效的主机名或IP地址']
          },
          {
            name: 'COSEREEDEN_DATABASE_URL',
            description: '数据库连接URL',
            type: 'string',
            required: true,
            exampleValue: 'postgresql://user:password@localhost:5432/cosereeden',
            category: 'database',
            priority: 'P0',
            securitySensitive: true,
            validationRules: ['必须是有效的PostgreSQL连接字符串']
          },
          {
            name: 'COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID',
            description: 'Cloudflare R2访问密钥ID',
            type: 'string',
            required: true,
            category: 'storage',
            priority: 'P0',
            securitySensitive: true,
            validationRules: ['必须是有效的Cloudflare R2访问密钥']
          }
        ]
      },
      {
        name: 'P1级配置 (核心功能)',
        description: '这些配置影响核心功能的正常运行，建议在生产环境中配置。',
        priority: 'P1',
        variables: [
          {
            name: 'COSEREEDEN_EMAIL_FROM',
            description: '发件人邮箱地址',
            type: 'string',
            required: false,
            defaultValue: 'noreply@cosereeden.com',
            exampleValue: 'noreply@yourdomain.com',
            category: 'email',
            priority: 'P1',
            securitySensitive: false,
            validationRules: ['必须是有效的邮箱地址格式']
          },
          {
            name: 'COSEREEDEN_NEXTAUTH_SECRET',
            description: 'NextAuth密钥',
            type: 'string',
            required: true,
            category: 'auth',
            priority: 'P1',
            securitySensitive: true,
            validationRules: ['至少32个字符', '包含大小写字母、数字和特殊字符']
          }
        ]
      }
    ];
  }
}
