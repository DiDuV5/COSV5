/**
 * @fileoverview 认证路由模块导出
 * @description 统一导出所有认证相关的路由
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { createTRPCRouter } from '@/server/api/trpc';

import { processUserRegistration } from './user-registration';
import { getCurrentUserInfo, getUserSessionInfo, updateUserProfile } from './user-profile';
import { processUserLogin, loginProcedure, loginWithTurnstileProcedure } from './login';
import {
  processForgotPassword,
  processResetPassword,
  processChangePassword,
  forgotPasswordProcedure,
  resetPasswordProcedure,
  changePasswordProcedure
} from './password-management';

/**
 * 认证路由
 * 注意：这些文件导出的是函数，不是路由，所以这里创建一个空的路由结构
 * 实际的认证逻辑在各个API路由中实现
 */
export const authRouter = createTRPCRouter({
  // 这里可以添加具体的认证相关路由
  // 目前这些函数在API路由中直接使用
});

// 导出认证相关函数供API路由使用
export {
  processUserRegistration,
  getCurrentUserInfo as getUserProfile,
  getUserSessionInfo,
  updateUserProfile,
  processUserLogin,
  processForgotPassword,
  processResetPassword,
  processChangePassword,
};

// 导出路由定义供主路由使用
export {
  loginProcedure,
  loginWithTurnstileProcedure,
  forgotPasswordProcedure,
  resetPasswordProcedure,
  changePasswordProcedure,
};
