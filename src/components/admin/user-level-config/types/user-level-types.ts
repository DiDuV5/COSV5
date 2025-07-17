/**
 * @fileoverview 用户等级配置类型定义
 * @description 定义用户等级配置相关的所有类型和接口
 */

/**
 * 用户等级枚举
 */
export type UserLevel = 'GUEST' | 'USER' | 'VIP' | 'CREATOR' | 'ADMIN' | 'SUPER_ADMIN';

/**
 * 罐头配置表单数据
 */
export interface CansConfigForm {
  // 基础奖励
  dailySigninCans: number;
  consecutiveBonus: string;
  
  // 互动奖励
  likeCans: number;
  commentCans: number;
  shareCans: number;
  
  // 创作奖励
  postCans: number;
  momentCans: number;
  photoCans: number;
  
  // 行为限制
  dailyLikeLimit: number;
  dailyCommentLimit: number;
  dailyShareLimit: number;
  dailyMomentLimit: number;
  dailyPostLimit: number;
  
  // 被动奖励
  beLikedCans: number;
  beCommentedCans: number;
  beSharedCans: number;
  
  // 特殊奖励
  specialEventCans: number;
  achievementCans: number;
  referralCans: number;
}

/**
 * 用户等级配置组件属性
 */
export interface UserLevelConfigProps {
  userLevel: UserLevel;
  displayName: string;
  color: string;
}

/**
 * 表单验证规则
 */
export const FORM_VALIDATION_RULES = {
  dailySigninCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 1000, message: "不能大于1000" }
  },
  consecutiveBonus: {
    required: "必填项"
  },
  likeCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  commentCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  shareCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  postCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 500, message: "不能大于500" }
  },
  momentCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 200, message: "不能大于200" }
  },
  photoCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  dailyLikeLimit: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 1000, message: "不能大于1000" }
  },
  dailyCommentLimit: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  dailyShareLimit: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 100, message: "不能大于100" }
  },
  dailyMomentLimit: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 50, message: "不能大于50" }
  },
  dailyPostLimit: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 20, message: "不能大于20" }
  },
  beLikedCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 50, message: "不能大于50" }
  },
  beCommentedCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 50, message: "不能大于50" }
  },
  beSharedCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 50, message: "不能大于50" }
  },
  specialEventCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 1000, message: "不能大于1000" }
  },
  achievementCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 500, message: "不能大于500" }
  },
  referralCans: {
    required: "必填项",
    min: { value: 0, message: "不能小于0" },
    max: { value: 200, message: "不能大于200" }
  }
} as const;

/**
 * 用户等级显示配置
 */
export const USER_LEVEL_DISPLAY_CONFIG = {
  GUEST: {
    displayName: '游客',
    color: 'bg-gray-100 text-gray-800',
    description: '未注册用户，功能受限'
  },
  USER: {
    displayName: '普通用户',
    color: 'bg-blue-100 text-blue-800',
    description: '已注册用户，基础功能'
  },
  VIP: {
    displayName: 'VIP用户',
    color: 'bg-purple-100 text-purple-800',
    description: 'VIP用户，享受特权'
  },
  CREATOR: {
    displayName: '创作者',
    color: 'bg-green-100 text-green-800',
    description: '内容创作者，创作奖励'
  },
  ADMIN: {
    displayName: '管理员',
    color: 'bg-orange-100 text-orange-800',
    description: '平台管理员，管理权限'
  },
  SUPER_ADMIN: {
    displayName: '超级管理员',
    color: 'bg-red-100 text-red-800',
    description: '最高权限管理员'
  }
} as const;

/**
 * 配置字段分组
 */
export const CONFIG_FIELD_GROUPS = {
  BASIC_REWARDS: {
    title: '基础奖励',
    icon: 'Coins',
    fields: ['dailySigninCans', 'consecutiveBonus']
  },
  INTERACTION_REWARDS: {
    title: '互动奖励',
    icon: 'Heart',
    fields: ['likeCans', 'commentCans', 'shareCans']
  },
  CREATION_REWARDS: {
    title: '创作奖励',
    icon: 'PenTool',
    fields: ['postCans', 'momentCans', 'photoCans']
  },
  BEHAVIOR_LIMITS: {
    title: '行为限制',
    icon: 'Target',
    fields: ['dailyLikeLimit', 'dailyCommentLimit', 'dailyShareLimit', 'dailyMomentLimit', 'dailyPostLimit']
  },
  PASSIVE_REWARDS: {
    title: '被动奖励',
    icon: 'Gift',
    fields: ['beLikedCans', 'beCommentedCans', 'beSharedCans']
  },
  SPECIAL_REWARDS: {
    title: '特殊奖励',
    icon: 'TrendingUp',
    fields: ['specialEventCans', 'achievementCans', 'referralCans']
  }
} as const;

/**
 * 字段标签映射
 */
export const FIELD_LABELS = {
  dailySigninCans: '每日基础罐头',
  consecutiveBonus: '连续签到奖励',
  likeCans: '点赞奖励',
  commentCans: '评论奖励',
  shareCans: '分享奖励',
  postCans: '发布作品奖励',
  momentCans: '发布动态奖励',
  photoCans: '上传照片奖励',
  dailyLikeLimit: '每日点赞上限',
  dailyCommentLimit: '每日评论上限',
  dailyShareLimit: '每日分享上限',
  dailyMomentLimit: '每日动态上限',
  dailyPostLimit: '每日作品上限',
  beLikedCans: '被点赞奖励',
  beCommentedCans: '被评论奖励',
  beSharedCans: '被分享奖励',
  specialEventCans: '特殊活动奖励',
  achievementCans: '成就奖励',
  referralCans: '推荐奖励'
} as const;

/**
 * 字段描述映射
 */
export const FIELD_DESCRIPTIONS = {
  dailySigninCans: '用户每日签到获得的基础罐头数量',
  consecutiveBonus: '连续签到的额外奖励规则',
  likeCans: '用户点赞他人内容获得的罐头',
  commentCans: '用户评论他人内容获得的罐头',
  shareCans: '用户分享内容获得的罐头',
  postCans: '用户发布作品获得的罐头',
  momentCans: '用户发布动态获得的罐头',
  photoCans: '用户上传照片获得的罐头',
  dailyLikeLimit: '用户每日最多可以点赞的次数',
  dailyCommentLimit: '用户每日最多可以评论的次数',
  dailyShareLimit: '用户每日最多可以分享的次数',
  dailyMomentLimit: '用户每日最多可以发布的动态数',
  dailyPostLimit: '用户每日最多可以发布的作品数',
  beLikedCans: '用户内容被他人点赞获得的罐头',
  beCommentedCans: '用户内容被他人评论获得的罐头',
  beSharedCans: '用户内容被他人分享获得的罐头',
  specialEventCans: '特殊活动期间的额外奖励',
  achievementCans: '完成成就获得的奖励',
  referralCans: '推荐新用户获得的奖励'
} as const;

/**
 * 工具函数：获取用户等级显示信息
 */
export function getUserLevelDisplayInfo(userLevel: UserLevel) {
  return USER_LEVEL_DISPLAY_CONFIG[userLevel];
}

/**
 * 工具函数：获取字段标签
 */
export function getFieldLabel(fieldName: keyof CansConfigForm): string {
  return FIELD_LABELS[fieldName] || fieldName;
}

/**
 * 工具函数：获取字段描述
 */
export function getFieldDescription(fieldName: keyof CansConfigForm): string {
  return FIELD_DESCRIPTIONS[fieldName] || '';
}

/**
 * 工具函数：获取字段验证规则
 */
export function getFieldValidationRule(fieldName: keyof CansConfigForm) {
  return FORM_VALIDATION_RULES[fieldName];
}
