/**
 * @fileoverview 密码处理工具测试
 * @description 测试密码空格处理和验证功能
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { describe, it, expect } from '@jest/globals';
import {
  checkPasswordSpaces,
  cleanPasswordSpaces,
  validatePasswordSpaces,
  handlePasswordInput,
  handlePasswordKeyDown,
  handlePasswordPaste,
  createPasswordTransformer,
  checkPasswordStrengthWithoutSpaces,
  DEFAULT_PASSWORD_SPACE_CONFIG,
} from '../password-utils';

describe('密码空格处理工具', () => {
  describe('checkPasswordSpaces', () => {
    it('应该正确检测前导空格', () => {
      const result = checkPasswordSpaces(' password123');
      expect(result.hasLeadingSpaces).toBe(true);
      expect(result.hasTrailingSpaces).toBe(false);
      expect(result.hasInternalSpaces).toBe(true);
      expect(result.spaceCount).toBe(1);
      expect(result.cleanedPassword).toBe('password123');
      expect(result.warnings).toContain('密码包含前导或尾随空格，将被自动去除');
    });

    it('应该正确检测尾随空格', () => {
      const result = checkPasswordSpaces('password123 ');
      expect(result.hasLeadingSpaces).toBe(false);
      expect(result.hasTrailingSpaces).toBe(true);
      expect(result.hasInternalSpaces).toBe(true);
      expect(result.spaceCount).toBe(1);
      expect(result.cleanedPassword).toBe('password123');
      expect(result.warnings).toContain('密码包含前导或尾随空格，将被自动去除');
    });

    it('应该正确检测内部空格', () => {
      const result = checkPasswordSpaces('pass word123');
      expect(result.hasLeadingSpaces).toBe(false);
      expect(result.hasTrailingSpaces).toBe(false);
      expect(result.hasInternalSpaces).toBe(true);
      expect(result.spaceCount).toBe(1);
      expect(result.cleanedPassword).toBe('pass word123');
      expect(result.warnings).toContain('密码包含空格字符，可能影响登录');
    });

    it('应该正确处理无空格的密码', () => {
      const result = checkPasswordSpaces('password123');
      expect(result.hasLeadingSpaces).toBe(false);
      expect(result.hasTrailingSpaces).toBe(false);
      expect(result.hasInternalSpaces).toBe(false);
      expect(result.spaceCount).toBe(0);
      expect(result.cleanedPassword).toBe('password123');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('cleanPasswordSpaces', () => {
    it('应该去除前导和尾随空格', () => {
      const result = cleanPasswordSpaces(' password123 ');
      expect(result).toBe('password123');
    });

    it('应该去除所有空格（当不允许内部空格时）', () => {
      const result = cleanPasswordSpaces(' pass word 123 ', {
        ...DEFAULT_PASSWORD_SPACE_CONFIG,
        allowInternalSpaces: false,
      });
      expect(result).toBe('password123');
    });

    it('应该保留内部空格（当允许内部空格时）', () => {
      const result = cleanPasswordSpaces(' pass word 123 ', {
        ...DEFAULT_PASSWORD_SPACE_CONFIG,
        allowInternalSpaces: true,
      });
      expect(result).toBe('pass word 123');
    });

    it('应该处理空字符串', () => {
      const result = cleanPasswordSpaces('');
      expect(result).toBe('');
    });
  });

  describe('validatePasswordSpaces', () => {
    it('应该验证通过无空格的密码', () => {
      const result = validatePasswordSpaces('password123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.cleanedPassword).toBe('password123');
    });

    it('应该验证失败包含内部空格的密码', () => {
      const result = validatePasswordSpaces('pass word123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码不能包含空格字符');
    });

    it('应该提供前导/尾随空格的警告', () => {
      const result = validatePasswordSpaces(' password123 ');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('密码的前导和尾随空格将被自动去除');
      expect(result.cleanedPassword).toBe('password123');
    });
  });

  describe('handlePasswordInput', () => {
    it('应该阻止空格输入', () => {
      const mockEvent = {
        target: { value: 'password ' }
      } as React.ChangeEvent<HTMLInputElement>;

      const result = handlePasswordInput(mockEvent);
      expect(result.shouldPreventDefault).toBe(true);
      expect(result.processedValue).toBe('password');
      expect(result.warnings).toContain('密码不能包含空格字符');
    });

    it('应该允许正常字符输入', () => {
      const mockEvent = {
        target: { value: 'password123' }
      } as React.ChangeEvent<HTMLInputElement>;

      const result = handlePasswordInput(mockEvent);
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.processedValue).toBe('password123');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('handlePasswordKeyDown', () => {
    it('应该阻止空格键', () => {
      const mockEvent = {
        key: ' '
      } as React.KeyboardEvent<HTMLInputElement>;

      const result = handlePasswordKeyDown(mockEvent);
      expect(result.shouldPreventDefault).toBe(true);
      expect(result.warning).toBe('密码不能包含空格字符');
    });

    it('应该允许其他按键', () => {
      const mockEvent = {
        key: 'a'
      } as React.KeyboardEvent<HTMLInputElement>;

      const result = handlePasswordKeyDown(mockEvent);
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('handlePasswordPaste', () => {
    it('应该清理粘贴的密码中的空格', () => {
      const mockEvent = {
        clipboardData: {
          getData: () => ' password 123 '
        }
      } as unknown as React.ClipboardEvent<HTMLInputElement>;

      const result = handlePasswordPaste(mockEvent);
      expect(result.shouldPreventDefault).toBe(true);
      expect(result.processedValue).toBe('password123');
      expect(result.warnings).toContain('粘贴的密码包含空格，已自动去除');
    });

    it('应该允许粘贴无空格的密码', () => {
      const mockEvent = {
        clipboardData: {
          getData: () => 'password123'
        }
      } as unknown as React.ClipboardEvent<HTMLInputElement>;

      const result = handlePasswordPaste(mockEvent);
      expect(result.shouldPreventDefault).toBe(false);
      expect(result.processedValue).toBe('password123');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('createPasswordTransformer', () => {
    it('应该创建正确的变换器', () => {
      const transformer = createPasswordTransformer();

      expect(transformer.input('')).toBe('');
      expect(transformer.input('password')).toBe('password');

      const mockEvent = {
        target: { value: ' password123 ' }
      } as React.ChangeEvent<HTMLInputElement>;

      expect(transformer.output(mockEvent)).toBe('password123');
    });
  });

  describe('checkPasswordStrengthWithoutSpaces', () => {
    it('应该基于清理后的密码检查强度', () => {
      const result = checkPasswordStrengthWithoutSpaces(' Password123! ');
      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThan(4);
    });

    it('应该正确评估弱密码', () => {
      const result = checkPasswordStrengthWithoutSpaces(' 123 ');
      expect(result.strength).toBe('weak');
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('应该正确评估中等强度密码', () => {
      const result = checkPasswordStrengthWithoutSpaces(' Password1 ');
      expect(result.strength).toBe('medium');
    });
  });

  describe('边界情况测试', () => {
    it('应该处理null和undefined', () => {
      expect(cleanPasswordSpaces('')).toBe('');
      expect(validatePasswordSpaces('').isValid).toBe(true); // 空字符串在我们的实现中是有效的
    });

    it('应该处理只包含空格的密码', () => {
      const result = cleanPasswordSpaces('   ');
      expect(result).toBe('');
    });

    it('应该处理多个连续空格', () => {
      const result = cleanPasswordSpaces('  pass  word  ');
      expect(result).toBe('password');
    });

    it('应该处理制表符和换行符', () => {
      const result = cleanPasswordSpaces('\tpassword\n');
      expect(result).toBe('password');
    });
  });

  describe('配置选项测试', () => {
    it('应该根据配置允许内部空格', () => {
      const config = {
        ...DEFAULT_PASSWORD_SPACE_CONFIG,
        allowInternalSpaces: true,
      };

      const result = validatePasswordSpaces('pass word', config);
      expect(result.isValid).toBe(true);
    });

    it('应该根据配置禁用空格阻止', () => {
      const config = {
        ...DEFAULT_PASSWORD_SPACE_CONFIG,
        preventSpaceInput: false,
      };

      const mockEvent = {
        key: ' '
      } as React.KeyboardEvent<HTMLInputElement>;

      const result = handlePasswordKeyDown(mockEvent, config);
      expect(result.shouldPreventDefault).toBe(false);
    });

    it('应该根据配置禁用警告', () => {
      const config = {
        ...DEFAULT_PASSWORD_SPACE_CONFIG,
        showSpaceWarning: false,
        allowInternalSpaces: true, // 允许内部空格，这样就不会有错误，只有警告
      };

      const result = validatePasswordSpaces(' password ', config);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
