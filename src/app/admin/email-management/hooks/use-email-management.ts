/**
 * @fileoverview 邮箱管理自定义Hook
 * @author Augment AI
 * @date 2025-07-03
 */

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import type {
  EmailConfig,
  CleanupDialogState,
  CleanupType,
  TemplateVariables
} from "../types/email-management";

export function useEmailManagement() {
  const { toast } = useToast();

  // 状态管理
  const [activeTab, setActiveTab] = useState("config");
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("VERIFICATION");
  const [previewDialog, setPreviewDialog] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [cleanupDialog, setCleanupDialog] = useState<CleanupDialogState>({
    open: false,
    type: null,
    title: '',
    description: '',
  });

  // 模板编辑状态
  const [editedSubject, setEditedSubject] = useState("");
  const [editedHtmlContent, setEditedHtmlContent] = useState("");
  const [editedTextContent, setEditedTextContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 邮箱配置状态
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpFromName: "CoserEden",
    smtpFromEmail: "",
  });

  // API 查询
  const {
    data: configData,
    isPending: configLoading,
    refetch: refetchConfig
  } = api.settings.getEmailSettings.useQuery();

  const {
    data: templatesData,
    isPending: templatesLoading,
  } = api.admin.emailTemplate.getTemplates.useQuery();

  const {
    data: templateDetail,
    isPending: templateDetailLoading,
    refetch: templateDetailRefetch,
  } = api.admin.emailTemplate.getTemplate.useQuery(
    { type: selectedTemplate as any },
    { enabled: !!selectedTemplate }
  );

  const {
    data: cleanupStats,
    isPending: cleanupStatsLoading,
    refetch: refetchCleanupStats
  } = api.admin.emailCleanup.getStats.useQuery();

  const {
    data: emailStatusDetails,
    isPending: emailStatusLoading,
    refetch: refetchEmailStatus
  } = api.admin.emailCleanup.getEmailStatusDetails.useQuery();

  // Mutations
  const updateConfigMutation = api.settings.updateEmailSettings.useMutation({
    onSuccess: () => {
      toast({
        title: "配置更新成功",
        description: "邮箱配置已成功更新",
        variant: "default",
      });
      refetchConfig();
    },
    onError: (error: any) => {
      toast({
        title: "配置更新失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = api.settings.testEmailConnection.useMutation({
    onSuccess: (result) => {
      toast({
        title: result.success ? "连接测试成功" : "连接测试失败",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "连接测试失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendTestEmailMutation = api.settings.sendTestEmail.useMutation({
    onSuccess: (result) => {
      toast({
        title: result.success ? "测试邮件发送成功" : "测试邮件发送失败",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "测试邮件发送失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cleanupMutation = api.admin.emailCleanup.cleanupEmails.useMutation({
    onSuccess: (result) => {
      toast({
        title: "清理完成",
        description: `成功清理 ${result.deletedUsers} 个用户，${result.deletedTokens} 个令牌`,
        variant: "default",
      });
      refetchCleanupStats();
      refetchEmailStatus();
    },
    onError: (error: any) => {
      toast({
        title: "清理失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const previewMutation = api.admin.emailTemplate.previewTemplate.useMutation({
    onSuccess: (result) => {
      setPreviewContent(result.previewHtml);
      setPreviewDialog(true);
    },
    onError: (error: any) => {
      toast({
        title: "预览失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveTemplateMutation = api.admin.emailTemplate.saveTemplate.useMutation({
    onSuccess: (result) => {
      setHasUnsavedChanges(false);
      toast({
        title: "保存成功",
        description: result.message,
        variant: "default",
      });
      templateDetailRefetch();
    },
    onError: (error: any) => {
      toast({
        title: "保存失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 初始化配置数据
  useEffect(() => {
    if (configData) {
      setEmailConfig(configData);
    }
  }, [configData]);

  // 初始化模板数据
  useEffect(() => {
    if (templateDetail?.template) {
      setEditedSubject(templateDetail.template.subject || "");
      setEditedHtmlContent(templateDetail.template.htmlContent || "");
      setEditedTextContent(templateDetail.template.textContent || "");
      setHasUnsavedChanges(false);
    }
  }, [templateDetail, selectedTemplate]);

  return {
    // 状态
    activeTab,
    setActiveTab,
    isLoading,
    setIsLoading,
    testEmail,
    setTestEmail,
    selectedTemplate,
    setSelectedTemplate,
    previewDialog,
    setPreviewDialog,
    previewContent,
    cleanupDialog,
    setCleanupDialog,
    editedSubject,
    setEditedSubject,
    editedHtmlContent,
    setEditedHtmlContent,
    editedTextContent,
    setEditedTextContent,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    emailConfig,
    setEmailConfig,

    // 查询数据
    configData,
    configLoading,
    templatesData,
    templatesLoading,
    templateDetail,
    templateDetailLoading,
    cleanupStats,
    cleanupStatsLoading,
    emailStatusDetails,
    emailStatusLoading,

    // Mutations
    updateConfigMutation,
    testConnectionMutation,
    sendTestEmailMutation,
    cleanupMutation,
    previewMutation,
    saveTemplateMutation,

    // 刷新函数
    refetchConfig,
    refetchCleanupStats,
    refetchEmailStatus,
    templateDetailRefetch,
  };
}
