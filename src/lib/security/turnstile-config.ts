/**
 * @fileoverview Turnstile配置统一导出
 * @description 统一导出客户端和服务端Turnstile配置，遵循12-Factor App原则
 * @author Augment AI
 * @date 2025-07-10
 * @version 2.0.0
 */

// 重新导出环境配置系统（核心配置）
export {
  loadTurnstileEnvConfig,
  getClientSafeConfig,
  getServerConfig,
  isConfigReady,
  getConfigStatus,
  TurnstileConfigError,
  TURNSTILE_ENV_VARS,
  type TurnstileEnvConfig,
  type ValidationResult
} from './turnstile-env-config';

// 重新导出客户端配置（客户端和服务端都可使用）
export {
  getClientTurnstileConfig,
  detectDeviceType,
  getDeviceAppropriateSize,
  validateTurnstileConfig as validateClientTurnstileConfig,
  getTurnstileScriptUrl,
  isTurnstileScriptLoaded,
  loadTurnstileScript,
  getTurnstileTheme,
  getTurnstileLanguage,
  createTurnstileConfig,
  TURNSTILE_ERROR_MESSAGES,
  getTurnstileErrorMessage,
  isDevelopmentMode,
  getTurnstileDebugInfo
} from './turnstile-client-config';

// 重新导出服务端配置（仅在服务端使用）
export {
  turnstileFeatureManager,
  TurnstileFeatureManager,
  getServerTurnstileConfig
} from './turnstile-server-config';
