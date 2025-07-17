/**
 * 密码验证工具函数
 * 提供密码强度验证和安全检查
 * 
 * @author Augment AI
 * @date 2025-07-17
 */

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number;
}

/**
 * 获取密码要求配置
 */
export function getPasswordRequirements(): PasswordRequirements {
  return {
    minLength: parseInt(process.env.COSEREEDEN_PASSWORD_MIN_LENGTH || '8'),
    requireUppercase: process.env.COSEREEDEN_PASSWORD_REQUIRE_UPPERCASE === 'true',
    requireLowercase: process.env.COSEREEDEN_PASSWORD_REQUIRE_LOWERCASE === 'true',
    requireNumbers: process.env.COSEREEDEN_PASSWORD_REQUIRE_NUMBERS === 'true',
    requireSpecial: process.env.COSEREEDEN_PASSWORD_REQUIRE_SPECIAL === 'true',
  };
}

/**
 * 验证密码强度
 */
export function validatePassword(password: string): PasswordValidationResult {
  const requirements = getPasswordRequirements();
  const errors: string[] = [];
  let score = 0;

  // 长度检查
  if (password.length < requirements.minLength) {
    errors.push(`密码长度至少需要${requirements.minLength}位`);
  } else {
    score += 25;
  }

  // 大写字母检查
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母');
  } else if (/[A-Z]/.test(password)) {
    score += 20;
  }

  // 小写字母检查
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母');
  } else if (/[a-z]/.test(password)) {
    score += 20;
  }

  // 数字检查
  if (requirements.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('密码必须包含数字');
  } else if (/[0-9]/.test(password)) {
    score += 20;
  }

  // 特殊字符检查
  if (requirements.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含特殊字符');
  } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 15;
  }

  // 额外强度检查
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;

  // 确定强度等级
  let strength: 'weak' | 'medium' | 'strong';
  if (score >= 80) {
    strength = 'strong';
  } else if (score >= 60) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score: Math.min(100, score)
  };
}

/**
 * 检查密码是否为常见弱密码
 */
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    '123456', 'password', '123456789', '12345678', '12345',
    '1234567', '1234567890', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234'
  ];
  
  return commonPasswords.includes(password.toLowerCase());
}
