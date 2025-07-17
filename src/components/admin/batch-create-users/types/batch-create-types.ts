/**
 * @fileoverview 批量创建用户类型定义
 * @description 定义批量创建用户相关的所有类型和验证模式
 */

import { z } from "zod";

/**
 * 用户等级类型
 */
export type UserLevel = "USER" | "VIP" | "CREATOR" | "ADMIN" | "SUPER_ADMIN";

/**
 * 单个用户验证模式
 */
export const userSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少3个字符")
    .max(20, "用户名最多20个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
  password: z.string().min(6, "密码至少6个字符").optional().or(z.literal("")),
  displayName: z.string().max(50, "显示名称最多50个字符").optional().or(z.literal("")),
  bio: z.string().max(500, "个人简介最多500个字符").optional().or(z.literal("")),
  userLevel: z.enum(["USER", "VIP", "CREATOR", "ADMIN", "SUPER_ADMIN"]).optional(),
  isVerified: z.boolean().optional(),
  canPublish: z.boolean().optional(),
});

/**
 * 批量创建表单数据类型
 */
export const batchCreateFormSchema = z.object({
  csvData: z.string().min(1, "请输入CSV数据"),
  defaultUserLevel: z.enum(["USER", "VIP", "CREATOR", "ADMIN", "SUPER_ADMIN"]),
  defaultIsVerified: z.boolean(),
  defaultCanPublish: z.boolean(),
  sendWelcomeEmail: z.boolean(),
  generateRandomPassword: z.boolean(),
});

export type BatchCreateFormData = z.infer<typeof batchCreateFormSchema>;
export type UserData = z.infer<typeof userSchema>;

/**
 * 解析后的用户数据
 */
export interface ParsedUserData extends UserData {
  lineNumber?: number;
}

/**
 * 创建结果
 */
export interface CreateUserResult {
  username: string;
  success: boolean;
  error?: string;
  userId?: string;
}

/**
 * 批量创建结果
 */
export interface BatchCreateResult {
  total: number;
  successful: number;
  failed: number;
  results: CreateUserResult[];
}

/**
 * 批量创建用户对话框属性
 */
export interface BatchCreateUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/**
 * CSV解析配置
 */
export interface CsvParseConfig {
  delimiter: string;
  skipEmptyLines: boolean;
  trimFields: boolean;
  maxRows: number;
}

/**
 * 默认CSV解析配置
 */
export const DEFAULT_CSV_CONFIG: CsvParseConfig = {
  delimiter: ',',
  skipEmptyLines: true,
  trimFields: true,
  maxRows: 50,
};

/**
 * CSV模板数据
 */
export const CSV_TEMPLATE = `username,email,password,displayName,bio,userLevel,isVerified,canPublish
testuser1,test1@example.com,password123,测试用户1,这是测试用户,USER,false,false
testuser2,test2@example.com,password123,测试用户2,这是测试用户,VIP,true,true
creator1,creator@example.com,password123,创作者1,专业cosplay创作者,CREATOR,true,true`;

/**
 * 字段映射配置
 */
export const FIELD_MAPPING = {
  username: { label: '用户名', required: true, description: '唯一标识符，3-20个字符' },
  email: { label: '邮箱', required: false, description: '用户邮箱地址，可选' },
  password: { label: '密码', required: false, description: '用户密码，至少6个字符' },
  displayName: { label: '显示名称', required: false, description: '用户显示名称，最多50个字符' },
  bio: { label: '个人简介', required: false, description: '用户个人简介，最多500个字符' },
  userLevel: { label: '用户等级', required: false, description: '用户权限等级' },
  isVerified: { label: '已验证', required: false, description: '是否已验证用户' },
  canPublish: { label: '可发布', required: false, description: '是否允许发布内容' },
} as const;

/**
 * 用户等级选项
 */
export const USER_LEVEL_OPTIONS = [
  { value: "USER", label: "普通用户", description: "基础功能用户" },
  { value: "VIP", label: "VIP用户", description: "享受特权的用户" },
  { value: "CREATOR", label: "创作者", description: "内容创作者" },
  { value: "ADMIN", label: "管理员", description: "平台管理员" },
  { value: "SUPER_ADMIN", label: "超级管理员", description: "最高权限管理员" },
] as const;

/**
 * 验证错误类型
 */
export interface ValidationError {
  lineNumber: number;
  field: string;
  message: string;
  value: string;
}

/**
 * 解析状态
 */
export interface ParseStatus {
  isPending: boolean;
  totalLines: number;
  processedLines: number;
  validUsers: number;
  errors: ValidationError[];
}

/**
 * 创建状态
 */
export interface CreateStatus {
  isCreating: boolean;
  totalUsers: number;
  processedUsers: number;
  successfulUsers: number;
  failedUsers: number;
  currentUser?: string;
}

/**
 * 工具函数：生成随机密码
 */
export function generateRandomPassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * 工具函数：验证用户名唯一性
 */
export function validateUsername(username: string, existingUsers: string[]): boolean {
  return !existingUsers.includes(username.toLowerCase());
}

/**
 * 工具函数：清理CSV字段
 */
export function cleanCsvField(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '');
}

/**
 * 工具函数：解析布尔值
 */
export function parseBoolean(value: string): boolean {
  const cleanValue = cleanCsvField(value).toLowerCase();
  return cleanValue === 'true' || cleanValue === '1' || cleanValue === 'yes';
}

/**
 * 工具函数：获取用户等级标签
 */
export function getUserLevelLabel(level: UserLevel): string {
  const option = USER_LEVEL_OPTIONS.find(opt => opt.value === level);
  return option?.label || level;
}

/**
 * 工具函数：获取字段描述
 */
export function getFieldDescription(fieldName: keyof typeof FIELD_MAPPING): string {
  return FIELD_MAPPING[fieldName]?.description || '';
}

/**
 * 工具函数：检查字段是否必需
 */
export function isFieldRequired(fieldName: keyof typeof FIELD_MAPPING): boolean {
  return FIELD_MAPPING[fieldName]?.required || false;
}

/**
 * 工具函数：格式化创建结果
 */
export function formatCreateResult(result: BatchCreateResult): string {
  const { total, successful, failed } = result;
  const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : '0';
  
  return `创建完成：总计 ${total} 个用户，成功 ${successful} 个，失败 ${failed} 个（成功率 ${successRate}%）`;
}

/**
 * 工具函数：导出创建结果为CSV
 */
export function exportResultsToCsv(results: CreateUserResult[]): string {
  const headers = ['用户名', '状态', '错误信息', '用户ID'];
  const rows = results.map(result => [
    result.username,
    result.success ? '成功' : '失败',
    result.error || '',
    result.userId || ''
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
    
  return csvContent;
}

/**
 * 工具函数：下载CSV文件
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
