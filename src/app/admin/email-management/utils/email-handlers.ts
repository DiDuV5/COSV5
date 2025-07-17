/**
 * @fileoverview 邮箱管理事件处理函数
 * @author Augment AI
 * @date 2025-07-03
 */

import type { 
  TemplateField, 
  CleanupType, 
  CleanupDialogState,
  TemplateVariables 
} from "../types/email-management";

export function createEmailHandlers(
  mutations: any,
  state: any,
  setState: any,
  toast: any
) {
  // 保存模板
  const saveTemplate = () => {
    if (!state.selectedTemplate || !state.editedSubject.trim() || !state.editedHtmlContent.trim()) {
      toast({
        title: "保存失败",
        description: "请填写完整的模板内容",
        variant: "destructive",
      });
      return;
    }

    mutations.saveTemplateMutation.mutate({
      type: state.selectedTemplate as any,
      subject: state.editedSubject,
      htmlContent: state.editedHtmlContent,
      textContent: state.editedTextContent,
    });
  };

  // 重置模板到默认状态
  const resetTemplate = () => {
    if (state.templateDetail?.template) {
      setState.setEditedSubject(state.templateDetail.template.subject || "");
      setState.setEditedHtmlContent(state.templateDetail.template.htmlContent || "");
      setState.setEditedTextContent(state.templateDetail.template.textContent || "");
      setState.setHasUnsavedChanges(false);
    } else if (state.templateDetail?.defaultTemplate) {
      setState.setEditedSubject(state.templateDetail.defaultTemplate.subject || "");
      setState.setEditedHtmlContent(state.templateDetail.defaultTemplate.htmlContent || "");
      setState.setEditedTextContent(state.templateDetail.defaultTemplate.textContent || "");
      setState.setHasUnsavedChanges(false);
    }
  };

  // 检测内容变化
  const handleContentChange = (field: TemplateField, value: string) => {
    switch (field) {
      case 'subject':
        setState.setEditedSubject(value);
        break;
      case 'html':
        setState.setEditedHtmlContent(value);
        break;
      case 'text':
        setState.setEditedTextContent(value);
        break;
    }
    setState.setHasUnsavedChanges(true);
  };

  // 处理模板切换
  const handleTemplateChange = (newTemplate: string) => {
    if (state.hasUnsavedChanges) {
      const confirmed = window.confirm(
        "您有未保存的更改，切换模板将丢失这些更改。是否继续？"
      );
      if (!confirmed) {
        return;
      }
    }
    setState.setSelectedTemplate(newTemplate);
    setState.setHasUnsavedChanges(false);
  };

  // 插入变量到编辑器
  const insertVariable = (variableName: string, field: TemplateField) => {
    const variable = `{{${variableName}}}`;
    switch (field) {
      case 'subject':
        setState.setEditedSubject((prev: string) => prev + variable);
        break;
      case 'html':
        setState.setEditedHtmlContent((prev: string) => prev + variable);
        break;
      case 'text':
        setState.setEditedTextContent((prev: string) => prev + variable);
        break;
    }
    setState.setHasUnsavedChanges(true);
  };

  // 处理配置更新
  const handleUpdateConfig = async () => {
    setState.setIsLoading(true);
    try {
      await mutations.updateConfigMutation.mutateAsync(state.emailConfig);
    } finally {
      setState.setIsLoading(false);
    }
  };

  // 处理连接测试
  const handleTestConnection = async () => {
    if (!state.testEmail) {
      toast({
        title: "请输入测试邮箱",
        description: "请输入有效的邮箱地址进行连接测试",
        variant: "destructive",
      });
      return;
    }

    setState.setIsLoading(true);
    try {
      await mutations.sendTestEmailMutation.mutateAsync({
        to: state.testEmail,
        subject: "CoserEden 邮件服务测试",
        content: "这是一封测试邮件，如果您收到此邮件，说明邮件服务配置正确。"
      });
    } finally {
      setState.setIsLoading(false);
    }
  };

  // 处理邮箱清理
  const handleCleanup = async (cleanupType: CleanupType) => {
    setState.setIsLoading(true);
    try {
      let cleanupConfig;

      switch (cleanupType) {
        case 'unverified':
          cleanupConfig = {
            dryRun: false,
            maxAge: 7,
            includeUnverified: true,
            includeExpiredTokens: false,
          };
          break;
        case 'expired':
          cleanupConfig = {
            dryRun: false,
            maxAge: 0,
            includeUnverified: false,
            includeExpiredTokens: true,
          };
          break;
        case 'all':
          cleanupConfig = {
            dryRun: false,
            maxAge: 7,
            includeUnverified: true,
            includeExpiredTokens: true,
          };
          break;
      }

      await mutations.cleanupMutation.mutateAsync(cleanupConfig);
    } finally {
      setState.setIsLoading(false);
    }
  };

  // 处理清理确认
  const handleCleanupConfirm = (cleanupType: CleanupType) => {
    const configs = {
      all: {
        title: '确认执行完整清理',
        description: '这将清理所有未验证邮箱（超过7天）和过期验证令牌。此操作不可撤销，请确认继续。',
      },
      unverified: {
        title: '确认清理未验证邮箱',
        description: '这将删除所有注册超过7天但未验证邮箱的用户账户。此操作不可撤销，请确认继续。',
      },
      expired: {
        title: '确认清理过期验证令牌',
        description: '这将清理所有已过期的邮箱验证令牌。此操作不可撤销，请确认继续。',
      },
    };

    const config = configs[cleanupType];
    setState.setCleanupDialog({
      open: true,
      type: cleanupType,
      title: config.title,
      description: config.description,
    });
  };

  // 执行清理操作
  const executeCleanup = async () => {
    if (!state.cleanupDialog.type) return;

    setState.setCleanupDialog((prev: CleanupDialogState) => ({ ...prev, open: false }));
    await handleCleanup(state.cleanupDialog.type);
  };

  // 处理模板预览
  const handlePreviewTemplate = () => {
    if (!state.templateDetail) return;

    const templateVariables: TemplateVariables = {
      username: "示例用户",
      verificationUrl: "https://cosereeden.com/auth/verify-email?token=example",
      resetUrl: "https://cosereeden.com/auth/reset-password?token=example",
      platformUrl: "https://cosereeden.com",
      supportEmail: "support@cosereeden.com",
      currentYear: new Date().getFullYear().toString(),
      companyName: "CoserEden",
      websiteUrl: "https://cosereeden.com",
      privacyPolicyUrl: "https://cosereeden.com/privacy",
      termsOfServiceUrl: "https://cosereeden.com/terms",
      unsubscribeUrl: "https://cosereeden.com/unsubscribe?token=example",
      estimatedTime: "1-3个工作日",
      supportContact: "https://t.me/CoserYYbot",
      loginUrl: "https://cosereeden.com/login",
      welcomeGuideUrl: "https://cosereeden.com/guide/welcome",
      communityUrl: "https://cosereeden.com/community",
      privilegeType: "VIP会员",
      privilegeLevel: "VIP",
      expirationDate: "2025年12月31日",
      features: ["高清上传", "优先展示", "专属标识", "客服优先"],
      guideUrl: "https://cosereeden.com/guide/vip",
      daysLeft: 7,
    };

    mutations.previewMutation.mutate({
      type: state.selectedTemplate as any,
      variables: templateVariables,
    });
  };

  return {
    saveTemplate,
    resetTemplate,
    handleContentChange,
    handleTemplateChange,
    insertVariable,
    handleUpdateConfig,
    handleTestConnection,
    handleCleanup,
    handleCleanupConfirm,
    executeCleanup,
    handlePreviewTemplate,
  };
}
