/**
 * @fileoverview 邮箱管理后台页面
 * @description 统一的邮箱配置、邮件模板管理和邮箱清理功能
 * @author Augment AI
 * @date 2025-07-03
 * @version 2.0.0 - 重构版本
 */

"use client";

import React from "react";
import { Mail, Settings, FileText, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// 导入重构后的组件和Hook
import { useEmailManagement } from "./hooks/use-email-management";
import { EmailConfigSection } from "./components/EmailConfigSection";
import { EmailTemplateSection } from "./components/EmailTemplateSection";
import { EmailCleanupSection } from "./components/EmailCleanupSection";
import { createEmailHandlers } from "./utils/email-handlers";

export default function EmailManagementPage() {
  const { toast } = useToast();

  // 使用重构后的自定义Hook
  const emailManagement = useEmailManagement();

  // 创建事件处理函数
  const handlers = createEmailHandlers(
    {
      updateConfigMutation: emailManagement.updateConfigMutation,
      testConnectionMutation: emailManagement.testConnectionMutation,
      sendTestEmailMutation: emailManagement.sendTestEmailMutation,
      cleanupMutation: emailManagement.cleanupMutation,
      previewMutation: emailManagement.previewMutation,
      saveTemplateMutation: emailManagement.saveTemplateMutation,
    },
    {
      selectedTemplate: emailManagement.selectedTemplate,
      editedSubject: emailManagement.editedSubject,
      editedHtmlContent: emailManagement.editedHtmlContent,
      editedTextContent: emailManagement.editedTextContent,
      hasUnsavedChanges: emailManagement.hasUnsavedChanges,
      templateDetail: emailManagement.templateDetail,
      testEmail: emailManagement.testEmail,
      emailConfig: emailManagement.emailConfig,
      cleanupDialog: emailManagement.cleanupDialog,
    },
    {
      setSelectedTemplate: emailManagement.setSelectedTemplate,
      setEditedSubject: emailManagement.setEditedSubject,
      setEditedHtmlContent: emailManagement.setEditedHtmlContent,
      setEditedTextContent: emailManagement.setEditedTextContent,
      setHasUnsavedChanges: emailManagement.setHasUnsavedChanges,
      setIsLoading: emailManagement.setIsLoading,
      setCleanupDialog: emailManagement.setCleanupDialog,
    },
    toast
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">邮箱管理</h1>
        <p className="text-gray-600 mt-2">配置邮箱服务、管理邮件模板和清理邮箱数据</p>
      </div>

      <Tabs value={emailManagement.activeTab} onValueChange={emailManagement.setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            邮箱配置
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            邮件模板
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            邮箱清理
          </TabsTrigger>
        </TabsList>

        {/* 邮箱配置 */}
        <TabsContent value="config">
          <EmailConfigSection
            emailConfig={emailManagement.emailConfig}
            setEmailConfig={emailManagement.setEmailConfig}
            testEmail={emailManagement.testEmail}
            setTestEmail={emailManagement.setTestEmail}
            isLoading={emailManagement.isLoading}
            configLoading={emailManagement.configLoading}
            onUpdateConfig={handlers.handleUpdateConfig}
            onTestConnection={handlers.handleTestConnection}
            onRefreshConfig={emailManagement.refetchConfig}
          />
        </TabsContent>

        {/* 邮件模板 */}
        <TabsContent value="templates">
          <EmailTemplateSection
            selectedTemplate={emailManagement.selectedTemplate}
            templatesData={emailManagement.templatesData}
            templateDetail={emailManagement.templateDetail}
            templatesLoading={emailManagement.templatesLoading}
            templateDetailLoading={emailManagement.templateDetailLoading}
            editedSubject={emailManagement.editedSubject}
            editedHtmlContent={emailManagement.editedHtmlContent}
            editedTextContent={emailManagement.editedTextContent}
            hasUnsavedChanges={emailManagement.hasUnsavedChanges}
            onTemplateChange={handlers.handleTemplateChange}
            onContentChange={handlers.handleContentChange}
            onInsertVariable={handlers.insertVariable}
            onSaveTemplate={handlers.saveTemplate}
            onResetTemplate={handlers.resetTemplate}
            onPreviewTemplate={handlers.handlePreviewTemplate}
          />
        </TabsContent>

        {/* 邮箱清理 */}
        <TabsContent value="cleanup">
          <EmailCleanupSection
            cleanupStats={emailManagement.cleanupStats}
            emailStatusDetails={emailManagement.emailStatusDetails}
            cleanupStatsLoading={emailManagement.cleanupStatsLoading}
            emailStatusLoading={emailManagement.emailStatusLoading}
            isLoading={emailManagement.isLoading}
            onCleanupConfirm={handlers.handleCleanupConfirm}
            onRefreshStats={() => {
              emailManagement.refetchCleanupStats();
              emailManagement.refetchEmailStatus();
            }}
          />
        </TabsContent>
      </Tabs>

      {/* 预览对话框 */}
      <Dialog open={emailManagement.previewDialog} onOpenChange={emailManagement.setPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>邮件模板预览</DialogTitle>
            <DialogDescription>
              预览 {emailManagement.templatesData?.templates.find((t: any) => t.type === emailManagement.selectedTemplate)?.name} 模板
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            <div
              dangerouslySetInnerHTML={{ __html: emailManagement.previewContent }}
              className="prose max-w-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => emailManagement.setPreviewDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清理确认对话框 */}
      <Dialog open={emailManagement.cleanupDialog.open} onOpenChange={(open) =>
        emailManagement.setCleanupDialog(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{emailManagement.cleanupDialog.title}</DialogTitle>
            <DialogDescription>
              {emailManagement.cleanupDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => emailManagement.setCleanupDialog(prev => ({ ...prev, open: false }))}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handlers.executeCleanup}
              disabled={emailManagement.isLoading}
            >
              {emailManagement.isLoading ? "清理中..." : "确认清理"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
