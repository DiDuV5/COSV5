/**
 * @fileoverview 安全指南生成器
 * @description 生成配置安全相关的指南和建议
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { SecurityGuideItem, DocGenerationConfig } from './doc-types';

/**
 * 安全指南生成器
 */
export class SecurityGuideGenerator {
  /**
   * 生成安全指南
   */
  generateSecurityGuide(config: DocGenerationConfig): string[] {
    const content: string[] = [];

    content.push('# CoserEden 配置安全指南');
    content.push('');
    content.push(`> 生成时间: ${new Date().toISOString()}`);
    content.push('');
    content.push('本指南提供了CoserEden项目配置安全的最佳实践和建议。');
    content.push('');

    // 目录
    content.push('## 目录');
    content.push('');
    content.push('- [关键安全原则](#关键安全原则)');
    content.push('- [密码和密钥管理](#密码和密钥管理)');
    content.push('- [环境变量安全](#环境变量安全)');
    content.push('- [生产环境配置](#生产环境配置)');
    content.push('- [安全检查清单](#安全检查清单)');
    content.push('- [常见安全问题](#常见安全问题)');
    content.push('');

    const securityItems = this.getSecurityGuideItems();

    for (const item of securityItems) {
      content.push(`## ${item.title}`);
      content.push('');
      content.push(item.description);
      content.push('');
      content.push(`**严重程度**: ${this.getSeverityEmoji(item.severity)} ${this.getSeverityText(item.severity)}`);
      content.push('');

      if (item.recommendations.length > 0) {
        content.push('### 建议措施');
        content.push('');
        for (const recommendation of item.recommendations) {
          content.push(`- ${recommendation}`);
        }
        content.push('');
      }

      if (item.examples && item.examples.length > 0) {
        content.push('### 示例');
        content.push('');
        for (const example of item.examples) {
          content.push('```bash');
          content.push(example);
          content.push('```');
          content.push('');
        }
      }
    }

    // 添加安全检查清单
    content.push(...this.generateSecurityChecklist());

    return content;
  }

  /**
   * 生成安全检查清单
   */
  private generateSecurityChecklist(): string[] {
    const content: string[] = [];

    content.push('## 安全检查清单');
    content.push('');
    content.push('在部署前请确保完成以下安全检查：');
    content.push('');

    const checkItems = [
      {
        category: '密码和密钥安全',
        items: [
          '所有密码长度至少16个字符',
          '密钥包含大小写字母、数字和特殊字符',
          '生产环境使用独特的密钥（不使用示例值）',
          '定期轮换敏感密钥',
          '使用密钥管理服务存储敏感信息'
        ]
      },
      {
        category: '环境变量安全',
        items: [
          '敏感配置不在代码中硬编码',
          '环境变量文件不提交到版本控制',
          '生产环境配置文件权限设置为600',
          '使用COSEREEDEN_前缀统一管理',
          '配置文件加密存储'
        ]
      },
      {
        category: '网络和传输安全',
        items: [
          '生产环境强制使用HTTPS',
          '数据库连接使用SSL/TLS',
          'Redis连接启用密码认证',
          '存储服务使用加密传输',
          '配置安全的CORS策略'
        ]
      },
      {
        category: '访问控制',
        items: [
          '实施最小权限原则',
          '配置强密码策略',
          '启用多因素认证',
          '定期审核用户权限',
          '监控异常访问行为'
        ]
      }
    ];

    for (const category of checkItems) {
      content.push(`### ${category.category}`);
      content.push('');
      for (const item of category.items) {
        content.push(`- [ ] ${item}`);
      }
      content.push('');
    }

    return content;
  }

  /**
   * 获取安全指南项目
   */
  private getSecurityGuideItems(): SecurityGuideItem[] {
    return [
      {
        title: '关键安全原则',
        description: '配置安全的基本原则和理念，这些原则应该贯穿整个配置管理过程。',
        severity: 'critical',
        recommendations: [
          '永远不要在代码中硬编码敏感信息',
          '使用环境变量管理所有配置',
          '为不同环境使用不同的配置值',
          '定期审核和更新配置',
          '实施配置变更的审批流程',
          '建立配置备份和恢复机制'
        ],
        examples: [
          '# 错误示例 - 硬编码密码\nconst password = "hardcoded-password"',
          '# 正确示例 - 使用环境变量\nconst password = process.env.COSEREEDEN_DATABASE_PASSWORD'
        ]
      },
      {
        title: '密码和密钥管理',
        description: '强密码和安全密钥是保护系统的第一道防线。',
        severity: 'critical',
        recommendations: [
          '使用至少16个字符的强密码',
          '包含大小写字母、数字和特殊字符',
          '避免使用字典词汇或个人信息',
          '为每个服务使用独特的密钥',
          '定期轮换密钥（建议每90天）',
          '使用密钥管理服务（如AWS KMS、Azure Key Vault）'
        ],
        examples: [
          '# 生成强密码示例\nopenssl rand -base64 32',
          '# 生成NextAuth密钥\nopenssl rand -hex 32'
        ]
      },
      {
        title: '环境变量安全',
        description: '正确管理环境变量是配置安全的核心。',
        severity: 'high',
        recommendations: [
          '使用.env文件管理本地开发配置',
          '将.env文件添加到.gitignore',
          '生产环境使用系统环境变量或密钥管理服务',
          '限制环境变量文件的访问权限',
          '避免在日志中输出敏感环境变量',
          '使用配置验证确保必需变量存在'
        ],
        examples: [
          '# 设置文件权限\nchmod 600 .env.production',
          '# 检查环境变量\nif (!process.env.COSEREEDEN_DATABASE_PASSWORD) {\n  throw new Error("Database password not configured")\n}'
        ]
      },
      {
        title: '生产环境配置',
        description: '生产环境需要额外的安全措施和配置。',
        severity: 'high',
        recommendations: [
          '禁用调试模式和详细错误信息',
          '启用HTTPS和安全头',
          '配置防火墙和网络安全组',
          '使用专用的数据库用户和权限',
          '启用审计日志和监控',
          '实施备份和灾难恢复计划'
        ],
        examples: [
          '# 生产环境配置示例\nNODE_ENV=production\nCOSEREEDEN_DEBUG=false\nCOSEREEDEN_HTTPS_ONLY=true'
        ]
      },
      {
        title: '常见安全问题',
        description: '识别和避免常见的配置安全问题。',
        severity: 'medium',
        recommendations: [
          '检查默认密码和示例配置',
          '验证SSL/TLS证书配置',
          '审核第三方服务的权限',
          '监控配置文件的变更',
          '定期进行安全扫描',
          '建立事件响应计划'
        ],
        examples: [
          '# 检查弱密码\ngrep -r "password.*123" .',
          '# 验证SSL配置\ncurl -I https://yourdomain.com'
        ]
      }
    ];
  }

  /**
   * 获取严重程度表情符号
   */
  private getSeverityEmoji(severity: string): string {
    const emojis: Record<string, string> = {
      'critical': '🔴',
      'high': '🟠',
      'medium': '🟡',
      'low': '🟢'
    };
    return emojis[severity] || '❓';
  }

  /**
   * 获取严重程度文本
   */
  private getSeverityText(severity: string): string {
    const texts: Record<string, string> = {
      'critical': '严重',
      'high': '高',
      'medium': '中等',
      'low': '低'
    };
    return texts[severity] || '未知';
  }
}
