/**
 * @fileoverview 环境变量安全扫描功能
 * @description 提供环境变量安全扫描和检查功能
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { SecurityScanResult, SecurityVulnerability } from './env-types';

/**
 * 执行安全扫描
 */
export async function performSecurityScan(envVars: Record<string, string | undefined>): Promise<SecurityScanResult> {
  const vulnerabilities: SecurityVulnerability[] = [];
  const recommendations: string[] = [];

  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;

    // 检查密码安全性
    if (isPasswordField(key)) {
      const passwordVulns = checkPasswordSecurity(key, value);
      vulnerabilities.push(...passwordVulns);
    }

    // 检查密钥安全性
    if (isSecretField(key)) {
      const secretVulns = checkSecretSecurity(key, value);
      vulnerabilities.push(...secretVulns);
    }

    // 检查不安全的默认值
    const defaultVulns = checkInsecureDefaults(key, value);
    vulnerabilities.push(...defaultVulns);
  }

  // 生成建议
  if (vulnerabilities.length === 0) {
    recommendations.push('配置安全性良好，未发现明显漏洞');
  } else {
    recommendations.push('建议立即修复发现的安全漏洞');
    recommendations.push('定期更新密码和密钥');
    recommendations.push('使用强密码和复杂密钥');
    recommendations.push('避免在配置中使用默认值');
    
    if (process.env.NODE_ENV === 'production') {
      recommendations.push('生产环境中确保所有敏感配置都已正确设置');
    }
  }

  // 计算安全评分
  const score = calculateSecurityScore(vulnerabilities);

  return {
    vulnerabilities,
    recommendations,
    score,
  };
}

/**
 * 检查密码安全性
 */
export function checkPasswordSecurity(key: string, value: string): SecurityVulnerability[] {
  const vulnerabilities: SecurityVulnerability[] = [];

  if (value.length < 8) {
    vulnerabilities.push({
      type: 'weak_password',
      severity: 'high',
      variable: key,
      description: '密码长度过短',
      recommendation: '使用至少8个字符的密码',
    });
  }

  if (value.length < 16 && process.env.NODE_ENV === 'production') {
    vulnerabilities.push({
      type: 'weak_password',
      severity: 'medium',
      variable: key,
      description: '生产环境密码强度不足',
      recommendation: '生产环境建议使用至少16个字符的强密码',
    });
  }

  // 检查密码复杂性
  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumbers = /[0-9]/.test(value);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(value);

  const complexityCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(Boolean).length;

  if (complexityCount < 3) {
    vulnerabilities.push({
      type: 'weak_password',
      severity: 'medium',
      variable: key,
      description: '密码复杂性不足',
      recommendation: '密码应包含大写字母、小写字母、数字和特殊字符中的至少3种',
    });
  }

  // 检查常见弱密码
  const commonPasswords = [
    'password', '123456', 'admin', 'root', 'test', 'demo',
    'password123', 'admin123', 'qwerty', 'abc123'
  ];

  if (commonPasswords.includes(value.toLowerCase())) {
    vulnerabilities.push({
      type: 'weak_password',
      severity: 'critical',
      variable: key,
      description: '使用了常见的弱密码',
      recommendation: '请使用复杂且唯一的密码',
    });
  }

  return vulnerabilities;
}

/**
 * 检查密钥安全性
 */
export function checkSecretSecurity(key: string, value: string): SecurityVulnerability[] {
  const vulnerabilities: SecurityVulnerability[] = [];

  if (value.length < 32) {
    vulnerabilities.push({
      type: 'weak_password',
      severity: 'high',
      variable: key,
      description: '密钥长度不足',
      recommendation: '建议使用至少32个字符的密钥',
    });
  }

  // 检查是否为明显的测试值
  const testPatterns = [
    /test/i, /demo/i, /example/i, /sample/i, /placeholder/i,
    /your-/i, /change-me/i, /replace-me/i
  ];

  if (testPatterns.some(pattern => pattern.test(value))) {
    const severity = process.env.NODE_ENV === 'production' ? 'critical' : 'medium';
    vulnerabilities.push({
      type: 'exposed_secret',
      severity,
      variable: key,
      description: '密钥包含测试或示例值',
      recommendation: '请使用真实的、安全的密钥值',
    });
  }

  // 检查熵值（简单检查）
  const uniqueChars = new Set(value).size;
  const entropyRatio = uniqueChars / value.length;

  if (entropyRatio < 0.5) {
    vulnerabilities.push({
      type: 'weak_password',
      severity: 'medium',
      variable: key,
      description: '密钥熵值较低，可能容易被猜测',
      recommendation: '使用更随机的字符组合',
    });
  }

  return vulnerabilities;
}

/**
 * 检查不安全的默认值
 */
export function checkInsecureDefaults(key: string, value: string): SecurityVulnerability[] {
  const vulnerabilities: SecurityVulnerability[] = [];

  // 检查默认端口和地址
  const insecureDefaults = [
    { pattern: /localhost/i, message: '使用localhost可能不适合生产环境' },
    { pattern: /127\.0\.0\.1/, message: '使用本地回环地址可能不适合生产环境' },
    { pattern: /^(admin|root|test|demo)$/i, message: '使用默认用户名存在安全风险' },
    { pattern: /^(false|0|no|off)$/i, key: /tls|ssl|secure/i, message: '在生产环境中禁用安全功能存在风险' },
  ];

  for (const check of insecureDefaults) {
    if (check.pattern.test(value)) {
      // 如果有key模式检查，需要同时匹配
      if (check.key && !check.key.test(key)) {
        continue;
      }

      const severity = process.env.NODE_ENV === 'production' ? 'high' : 'low';
      vulnerabilities.push({
        type: 'insecure_default',
        severity,
        variable: key,
        description: check.message,
        recommendation: '请根据实际环境调整配置值',
      });
    }
  }

  return vulnerabilities;
}

/**
 * 计算安全评分
 */
export function calculateSecurityScore(vulnerabilities: SecurityVulnerability[]): number {
  if (vulnerabilities.length === 0) {
    return 100;
  }

  let totalDeduction = 0;

  for (const vuln of vulnerabilities) {
    switch (vuln.severity) {
      case 'critical':
        totalDeduction += 25;
        break;
      case 'high':
        totalDeduction += 15;
        break;
      case 'medium':
        totalDeduction += 8;
        break;
      case 'low':
        totalDeduction += 3;
        break;
    }
  }

  // 确保评分不低于0
  return Math.max(0, 100 - totalDeduction);
}

/**
 * 检查是否为密码字段
 */
export function isPasswordField(key: string): boolean {
  const passwordPatterns = [
    /password/i, /passwd/i, /pwd/i, /pass/i
  ];
  return passwordPatterns.some(pattern => pattern.test(key));
}

/**
 * 检查是否为密钥字段
 */
export function isSecretField(key: string): boolean {
  const secretPatterns = [
    /secret/i, /key/i, /token/i, /auth/i, /credential/i,
    /private/i, /signature/i, /hash/i
  ];
  return secretPatterns.some(pattern => pattern.test(key));
}

/**
 * 掩码敏感值
 */
export function maskSensitiveValue(key: string, value: string): string {
  if (isSecretField(key) || isPasswordField(key)) {
    if (value.length <= 4) {
      return '***';
    }
    return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
  }
  return value;
}
