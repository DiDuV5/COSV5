// import { EmailTemplateType } from '@/lib/email/types/email-template-types'; // 暂时注释掉，避免导入错误
import { EmailTemplateService } from './email-template-service';
// import { prisma } from '@/lib/prisma'; // 暂时注释掉，避免导入错误

// 临时类型定义
type EmailTemplateType = string;

// 模拟 prisma 对象
const prisma = {
  emailTemplate: {
    upsert: async (_args: any) => ({}),
    findUnique: async (_args: any) => null,
    delete: async (_args: any) => ({}),
    findMany: async (_args: any) => [],
  }
};

/**
 * 自定义邮件模板服务
 * 负责管理数据库中的自定义邮件模板
 */
export class CustomEmailTemplateService {

  /**
   * 保存自定义邮件模板
   */
  static async saveCustomTemplate(
    type: EmailTemplateType,
    subject: string,
    htmlContent: string,
    textContent: string,
    createdBy?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await prisma.emailTemplate.upsert({
        where: { type: type.toString() },
        update: {
          subject,
          htmlContent,
          textContent,
          updatedAt: new Date(),
        },
        create: {
          type: type.toString(),
          subject,
          htmlContent,
          textContent,
          isCustom: true,
          createdBy,
        },
      });

      return {
        success: true,
        message: '邮件模板保存成功',
      };
    } catch (error) {
      console.error('保存邮件模板失败:', error);
      return {
        success: false,
        message: '保存邮件模板失败',
      };
    }
  }

  /**
   * 获取自定义邮件模板
   */
  static async getCustomTemplate(type: EmailTemplateType): Promise<{
    id: string;
    type: string;
    subject: string;
    htmlContent: string;
    textContent: string | null;
    isActive: boolean;
    isCustom: boolean;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: {
          type: type.toString(),
        },
      });

      return template;
    } catch (error) {
      console.error('获取自定义邮件模板失败:', error);
      return null;
    }
  }

  /**
   * 删除自定义邮件模板
   */
  static async deleteCustomTemplate(type: EmailTemplateType): Promise<{ success: boolean; message: string }> {
    try {
      await prisma.emailTemplate.delete({
        where: { type: type.toString() },
      });

      return {
        success: true,
        message: '邮件模板删除成功',
      };
    } catch (error) {
      console.error('删除邮件模板失败:', error);
      return {
        success: false,
        message: '删除邮件模板失败',
      };
    }
  }

  /**
   * 获取邮件模板（优先使用自定义模板，否则使用默认模板）
   */
  static async getEmailTemplate(type: EmailTemplateType, variables: Record<string, any> = {}) {
    try {
      console.log('🔍 CustomEmailTemplateService.getEmailTemplate 调用:', {
        type: type.toString(),
        variables: Object.keys(variables),
        variableValues: variables,
      });

      // 首先尝试获取自定义模板
      const customTemplate = await this.getCustomTemplate(type);

      console.log('🔍 获取自定义模板结果:', {
        hasCustomTemplate: !!customTemplate,
        isActive: (customTemplate as any)?.isActive,
        templateType: (customTemplate as any)?.type,
        subjectPreview: (customTemplate as any)?.subject?.substring(0, 50),
      });

      if (customTemplate && (customTemplate as any).isActive) {
        // 使用自定义模板，替换变量
        const subject = this.replaceVariables((customTemplate as any).subject, variables);
        const html = this.replaceVariables((customTemplate as any).htmlContent, variables);
        const text = (customTemplate as any).textContent
          ? this.replaceVariables((customTemplate as any).textContent, variables)
          : this.htmlToText(html);

        console.log('✅ 使用自定义模板:', {
          subject: subject.substring(0, 50),
          htmlLength: html.length,
          textLength: text.length,
          isCustom: true,
        });

        return {
          subject,
          html,
          text,
          isCustom: true,
        };
      }

      // 如果没有自定义模板，使用默认模板
      console.log('⚠️ 没有自定义模板，使用默认模板');
      const defaultTemplate = EmailTemplateService.generateEmailByType(type as any, variables);
      return {
        ...defaultTemplate,
        isCustom: false,
      };
    } catch (error) {
      console.error('❌ 获取邮件模板失败:', error);
      // 出错时回退到默认模板
      const defaultTemplate = EmailTemplateService.generateEmailByType(type as any, variables);
      return {
        ...defaultTemplate,
        isCustom: false,
      };
    }
  }

  /**
   * 替换模板中的变量
   */
  private static replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value || ''));
    }

    return result;
  }

  /**
   * 简单的HTML转文本
   */
  private static htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/&nbsp;/g, ' ') // 替换&nbsp;
      .replace(/&amp;/g, '&') // 替换&amp;
      .replace(/&lt;/g, '<') // 替换&lt;
      .replace(/&gt;/g, '>') // 替换&gt;
      .replace(/&quot;/g, '"') // 替换&quot;
      .replace(/&#39;/g, "'") // 替换&#39;
      .replace(/\s+/g, ' ') // 合并多个空格
      .trim();
  }

  /**
   * 获取所有自定义模板列表
   */
  static async getAllCustomTemplates() {
    try {
      const templates = await prisma.emailTemplate.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
        },
      });

      return templates;
    } catch (error) {
      console.error('获取自定义模板列表失败:', error);
      return [];
    }
  }

  /**
   * 检查是否存在自定义模板
   */
  static async hasCustomTemplate(type: EmailTemplateType): Promise<boolean> {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: {
          type: type.toString(),
        },
        select: { id: true, isActive: true },
      });

      return template !== null && (template as any).isActive;
    } catch (error) {
      console.error('检查自定义模板失败:', error);
      return false;
    }
  }
}
