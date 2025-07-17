/**
 * @fileoverview 密码处理工具函数
 * @description 统一的密码空格处理和验证工具
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

/**
 * 密码空格处理配置
 */
export interface PasswordSpaceConfig {
  // 是否自动去除前导和尾随空格
  trimSpaces: boolean;
  // 是否允许密码中包含空格
  allowInternalSpaces: boolean;
  // 是否在输入时阻止空格
  preventSpaceInput: boolean;
  // 是否显示空格警告
  showSpaceWarning: boolean;
}

/**
 * 默认密码空格处理配置
 */
export const DEFAULT_PASSWORD_SPACE_CONFIG: PasswordSpaceConfig = {
  trimSpaces: true,
  allowInternalSpaces: false,
  preventSpaceInput: true,
  showSpaceWarning: true,
};

/**
 * 密码空格检查结果
 */
export interface PasswordSpaceCheckResult {
  hasLeadingSpaces: boolean;
  hasTrailingSpaces: boolean;
  hasInternalSpaces: boolean;
  spaceCount: number;
  cleanedPassword: string;
  warnings: string[];
}

/**
 * 检查密码中的空格
 */
export function checkPasswordSpaces(password: string): PasswordSpaceCheckResult {
  const hasLeadingSpaces = password.length > 0 && password[0] === ' ';
  const hasTrailingSpaces = password.length > 0 && password[password.length - 1] === ' ';
  const hasInternalSpaces = /\s/.test(password);
  const spaceCount = (password.match(/\s/g) || []).length;
  const cleanedPassword = password.trim();
  
  const warnings: string[] = [];
  
  if (hasLeadingSpaces || hasTrailingSpaces) {
    warnings.push('密码包含前导或尾随空格，将被自动去除');
  }
  
  if (hasInternalSpaces && !hasLeadingSpaces && !hasTrailingSpaces) {
    warnings.push('密码包含空格字符，可能影响登录');
  }
  
  return {
    hasLeadingSpaces,
    hasTrailingSpaces,
    hasInternalSpaces,
    spaceCount,
    cleanedPassword,
    warnings,
  };
}

/**
 * 清理密码空格
 */
export function cleanPasswordSpaces(
  password: string, 
  config: PasswordSpaceConfig = DEFAULT_PASSWORD_SPACE_CONFIG
): string {
  if (!password) return password;
  
  let cleaned = password;
  
  // 去除前导和尾随空格
  if (config.trimSpaces) {
    cleaned = cleaned.trim();
  }
  
  // 如果不允许内部空格，则去除所有空格
  if (!config.allowInternalSpaces) {
    cleaned = cleaned.replace(/\s/g, '');
  }
  
  return cleaned;
}

/**
 * 验证密码空格
 */
export function validatePasswordSpaces(
  password: string,
  config: PasswordSpaceConfig = DEFAULT_PASSWORD_SPACE_CONFIG
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cleanedPassword: string;
} {
  const spaceCheck = checkPasswordSpaces(password);
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 检查是否允许内部空格
  if (!config.allowInternalSpaces && spaceCheck.hasInternalSpaces) {
    if (spaceCheck.hasLeadingSpaces || spaceCheck.hasTrailingSpaces) {
      warnings.push('密码的前导和尾随空格将被自动去除');
    } else {
      errors.push('密码不能包含空格字符');
    }
  }
  
  // 添加空格警告
  if (config.showSpaceWarning && spaceCheck.warnings.length > 0) {
    warnings.push(...spaceCheck.warnings);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    cleanedPassword: cleanPasswordSpaces(password, config),
  };
}

/**
 * 处理密码输入事件
 */
export function handlePasswordInput(
  event: React.ChangeEvent<HTMLInputElement>,
  config: PasswordSpaceConfig = DEFAULT_PASSWORD_SPACE_CONFIG
): {
  shouldPreventDefault: boolean;
  processedValue: string;
  warnings: string[];
} {
  const inputValue = event.target.value;
  const warnings: string[] = [];
  
  // 如果阻止空格输入
  if (config.preventSpaceInput) {
    const lastChar = inputValue[inputValue.length - 1];
    if (lastChar === ' ') {
      warnings.push('密码不能包含空格字符');
      return {
        shouldPreventDefault: true,
        processedValue: inputValue.slice(0, -1), // 移除最后一个空格
        warnings,
      };
    }
  }
  
  // 处理值
  const processedValue = config.trimSpaces ? inputValue.trim() : inputValue;
  
  return {
    shouldPreventDefault: false,
    processedValue,
    warnings,
  };
}

/**
 * 密码输入键盘事件处理
 */
export function handlePasswordKeyDown(
  event: React.KeyboardEvent<HTMLInputElement>,
  config: PasswordSpaceConfig = DEFAULT_PASSWORD_SPACE_CONFIG
): {
  shouldPreventDefault: boolean;
  warning?: string;
} {
  // 如果阻止空格输入且按下空格键
  if (config.preventSpaceInput && event.key === ' ') {
    return {
      shouldPreventDefault: true,
      warning: '密码不能包含空格字符',
    };
  }
  
  return {
    shouldPreventDefault: false,
  };
}

/**
 * 密码粘贴事件处理
 */
export function handlePasswordPaste(
  event: React.ClipboardEvent<HTMLInputElement>,
  config: PasswordSpaceConfig = DEFAULT_PASSWORD_SPACE_CONFIG
): {
  shouldPreventDefault: boolean;
  processedValue: string;
  warnings: string[];
} {
  const pastedText = event.clipboardData.getData('text');
  const spaceCheck = checkPasswordSpaces(pastedText);
  const warnings: string[] = [];
  
  // 如果粘贴的内容包含空格
  if (spaceCheck.hasInternalSpaces) {
    if (config.preventSpaceInput && !config.allowInternalSpaces) {
      warnings.push('粘贴的密码包含空格，已自动去除');
    } else if (spaceCheck.hasLeadingSpaces || spaceCheck.hasTrailingSpaces) {
      warnings.push('粘贴的密码包含前导或尾随空格，已自动去除');
    }
  }
  
  const processedValue = cleanPasswordSpaces(pastedText, config);
  
  return {
    shouldPreventDefault: pastedText !== processedValue,
    processedValue,
    warnings,
  };
}

/**
 * React Hook Form 密码变换器
 */
export function createPasswordTransformer(
  config: PasswordSpaceConfig = DEFAULT_PASSWORD_SPACE_CONFIG
) {
  return {
    input: (value: string) => value || '',
    output: (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      return cleanPasswordSpaces(value, config);
    },
  };
}

/**
 * 密码强度检查（排除空格影响）
 */
export function checkPasswordStrengthWithoutSpaces(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  feedback: string[];
} {
  // 使用清理后的密码进行强度检查
  const cleanedPassword = cleanPasswordSpaces(password);
  
  let score = 0;
  const feedback: string[] = [];
  
  // 长度检查
  if (cleanedPassword.length >= 8) score += 2;
  else if (cleanedPassword.length >= 6) score += 1;
  else feedback.push('密码长度至少需要6位');
  
  // 复杂度检查
  if (/[a-z]/.test(cleanedPassword)) score += 1;
  else feedback.push('建议包含小写字母');
  
  if (/[A-Z]/.test(cleanedPassword)) score += 1;
  else feedback.push('建议包含大写字母');
  
  if (/\d/.test(cleanedPassword)) score += 1;
  else feedback.push('建议包含数字');
  
  if (/[!@#$%^&*(),.?":{}|<>]/.test(cleanedPassword)) score += 1;
  else feedback.push('建议包含特殊字符');
  
  // 确定强度
  let strength: 'weak' | 'medium' | 'strong';
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  else strength = 'weak';
  
  return { strength, score, feedback };
}
