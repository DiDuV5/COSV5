/**
 * @fileoverview 邮件模板部分组件
 * @author Augment AI
 * @date 2025-07-03
 */
"use client";


import React from "react";
import { FileText, Eye, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TemplateField } from "../types/email-management";

interface EmailTemplateSectionProps {
  selectedTemplate: string;
  templatesData: any;
  templateDetail: any;
  templatesLoading: boolean;
  templateDetailLoading: boolean;
  editedSubject: string;
  editedHtmlContent: string;
  editedTextContent: string;
  hasUnsavedChanges: boolean;
  onTemplateChange: (_template: string) => void;
  onContentChange: (_field: TemplateField, value: string) => void;
  onInsertVariable: (variableName: string, field: TemplateField) => void;
  onSaveTemplate: () => void;
  onResetTemplate: () => void;
  onPreviewTemplate: () => void;
}

export function EmailTemplateSection({
  selectedTemplate,
  templatesData,
  templateDetail,
  templatesLoading,
  templateDetailLoading,
  editedSubject,
  editedHtmlContent,
  editedTextContent,
  hasUnsavedChanges,
  onTemplateChange,
  onContentChange,
  onInsertVariable,
  onSaveTemplate,
  onResetTemplate,
  onPreviewTemplate,
}: EmailTemplateSectionProps) {
  const availableVariables = [
    { name: 'username', description: '用户名' },
    { name: 'verificationUrl', description: '验证链接' },
    { name: 'resetUrl', description: '重置密码链接' },
    { name: 'platformUrl', description: '平台链接' },
    { name: 'supportEmail', description: '客服邮箱' },
    { name: 'currentYear', description: '当前年份' },
    { name: 'companyName', description: '公司名称' },
    { name: 'privilegeType', description: '权限类型' },
    { name: 'expirationDate', description: '过期日期' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            邮件模板管理
          </CardTitle>
          <CardDescription>
            编辑和管理系统邮件模板
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>选择模板类型</Label>
            <Select value={selectedTemplate} onValueChange={onTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="选择邮件模板" />
              </SelectTrigger>
              <SelectContent>
                {templatesData?.templates.map((template: any) => (
                  <SelectItem key={template.id} value={template.type}>
                    {template.name} - {template.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasUnsavedChanges && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                您有未保存的更改，请记得保存模板。
              </AlertDescription>
            </Alert>
          )}

          {templateDetailLoading ? (
            <div>加载模板详情中...</div>
          ) : templateDetail ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="templateSubject">邮件主题</Label>
                <Input
                  id="templateSubject"
                  value={editedSubject}
                  onChange={(e) => onContentChange('subject', e.target.value)}
                  placeholder="邮件主题"
                />
                <div className="flex gap-1 mt-2 flex-wrap">
                  {availableVariables.slice(0, 5).map((variable) => (
                    <Button
                      key={variable.name}
                      variant="outline"
                      size="sm"
                      onClick={() => onInsertVariable(variable.name, 'subject')}
                      className="text-xs"
                    >
                      {variable.description}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="templateHtml">HTML 内容</Label>
                <Textarea
                  id="templateHtml"
                  value={editedHtmlContent}
                  onChange={(e) => onContentChange('html', e.target.value)}
                  placeholder="HTML 邮件内容"
                  rows={15}
                  className="font-mono text-sm"
                />
                <div className="flex gap-1 mt-2 flex-wrap">
                  {availableVariables.map((variable) => (
                    <Button
                      key={variable.name}
                      variant="outline"
                      size="sm"
                      onClick={() => onInsertVariable(variable.name, 'html')}
                      className="text-xs"
                    >
                      {variable.description}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="templateText">纯文本内容（可选）</Label>
                <Textarea
                  id="templateText"
                  value={editedTextContent}
                  onChange={(e) => onContentChange('text', e.target.value)}
                  placeholder="纯文本邮件内容（备用）"
                  rows={8}
                />
                <div className="flex gap-1 mt-2 flex-wrap">
                  {availableVariables.slice(0, 5).map((variable) => (
                    <Button
                      key={variable.name}
                      variant="outline"
                      size="sm"
                      onClick={() => onInsertVariable(variable.name, 'text')}
                      className="text-xs"
                    >
                      {variable.description}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={onSaveTemplate}
                  disabled={!editedSubject.trim() || !editedHtmlContent.trim()}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  保存模板
                </Button>
                <Button
                  variant="outline"
                  onClick={onResetTemplate}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  重置
                </Button>
                <Button
                  variant="outline"
                  onClick={onPreviewTemplate}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  预览
                </Button>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">模板状态</h4>
                <div className="flex gap-2">
                  <Badge variant={templateDetail.template ? "default" : "secondary"}>
                    {templateDetail.template ? "已自定义" : "使用默认"}
                  </Badge>
                  {hasUnsavedChanges && (
                    <Badge variant="destructive">未保存</Badge>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>请选择一个模板类型</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
