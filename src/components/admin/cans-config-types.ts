/**
 * @fileoverview 罐头系统配置类型定义
 * @description 罐头配置相关的类型定义和接口
 * @author Augment AI
 * @date 2025-06-27
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 罐头配置表单数据接口
 */
export interface CansConfigForm {
  dailySigninCans: number;
  consecutiveBonus: string;
  likeCans: number;
  commentCans: number;
  shareCans: number;
  publishMomentCans: number;
  publishPostCans: number;
  dailyLikeLimit: number;
  dailyCommentLimit: number;
  dailyShareLimit: number;
  dailyMomentLimit: number;
  dailyPostLimit: number;
  beLikedCans: number;
  beCommentedCans: number;
  beSharedCans: number;
  dailyExperienceLimit: number;
  cansToExperienceRatio: number;
}

/**
 * 用户等级配置属性接口
 */
export interface UserLevelConfigProps {
  userLevel: string;
  displayName: string;
  color: string;
}

/**
 * 用户等级定义
 */
export interface UserLevelDefinition {
  level: string;
  name: string;
  color: string;
}

/**
 * 罐头配置更新参数
 */
export interface CansConfigUpdateParams extends CansConfigForm {
  userLevel: string;
  reason: string;
}

/**
 * 罐头配置重置参数
 */
export interface CansConfigResetParams {
  userLevel: string;
}

/**
 * 罐头配置响应数据
 */
export interface CansConfigResponse {
  success: boolean;
  message: string;
  data?: CansConfigForm;
}

/**
 * 标签页类型
 */
export type TabType = 'config' | 'experience' | 'templates' | 'history';

/**
 * 预定义的用户等级配置
 */
export const USER_LEVELS: UserLevelDefinition[] = [
  { level: 'GUEST', name: '游客', color: '#6b7280' },
  { level: 'USER', name: '注册用户', color: '#3b82f6' },
  { level: 'BASIC', name: '基础用户', color: '#10b981' },
  { level: 'STANDARD', name: '标准用户', color: '#f59e0b' },
  { level: 'PREMIUM', name: '高级用户', color: '#8b5cf6' },
  { level: 'VIP', name: 'VIP用户', color: '#ef4444' },
  { level: 'CREATOR', name: '创作者', color: '#f97316' },
  { level: 'ADMIN', name: '管理员', color: '#84cc16' },
];

/**
 * 表单验证规则
 */
export const FORM_VALIDATION_RULES = {
  dailySigninCans: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 1000, message: "不能大于1000" }
  },
  likeCans: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  commentCans: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  shareCans: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  publishMomentCans: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 200, message: "不能大于200" }
  },
  publishPostCans: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 500, message: "不能大于500" }
  },
  dailyLikeLimit: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 1000, message: "不能大于1000" }
  },
  dailyCommentLimit: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 500, message: "不能大于500" }
  },
  dailyShareLimit: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  dailyMomentLimit: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 50, message: "不能大于50" }
  },
  dailyPostLimit: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 20, message: "不能大于20" }
  },
  beLikedCans: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 50, message: "不能大于50" }
  },
  beCommentedCans: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 50, message: "不能大于50" }
  },
  beSharedCans: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  dailyExperienceLimit: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 10000, message: "不能大于10000" }
  },
  cansToExperienceRatio: {
    required: "必填项",
    valueAsNumber: true,
    min: { value: 0, message: "不能小于0" },
    max: { value: 10, message: "不能大于10" }
  }
} as const;
