/**
 * @fileoverview 注册页面模块统一导出
 * @description 统一导出注册页面相关的所有组件、hooks和类型
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

// 导出类型定义
export type {
  PublicSettings,
  SignUpFormData,
  RegisterRequestData,
  RegisterResponse,
  FormState,
  ValidationState,
} from "./types";

export { createSignUpSchema } from "./types";

// 导出组件
export {
  SignupForm,
  FormMessages,
  UsernameField,
  EmailField,
  DisplayNameField,
  PasswordField,
  ConfirmPasswordField,
  TermsAgreementField,
} from "./components";

// 导出hooks
export { useSignupForm } from "./hooks/use-signup-form";

// 导出主页面组件
export { default as SignUpPage } from "./page";
