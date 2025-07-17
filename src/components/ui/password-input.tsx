/**
 * @component PasswordInput
 * @description 安全的密码输入组件，带有显示/隐藏功能和空格处理
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 * @since 1.0.0
 *
 * @props
 * - value?: string - 密码值
 * - onChange?: (value: string) => void - 值变化回调
 * - placeholder?: string - 占位符文本
 * - className?: string - 自定义样式类
 * - disabled?: boolean - 是否禁用
 * - error?: boolean - 是否显示错误状态
 * - id?: string - 输入框ID
 * - name?: string - 输入框名称
 * - autoComplete?: string - 自动完成属性
 * - preventSpaces?: boolean - 是否阻止空格输入（默认true）
 * - showSpaceWarning?: boolean - 是否显示空格警告（默认true）
 * - onSpaceWarning?: (warning: string) => void - 空格警告回调
 *
 * @example
 * <PasswordInput
 *   value={password}
 *   onChange={setPassword}
 *   placeholder="请输入密码"
 *   error={!!errors.password}
 *   preventSpaces={true}
 *   onSpaceWarning={(warning) => setWarning(warning)}
 * />
 *
 * @dependencies
 * - React 18+
 * - Lucide React (图标)
 * - @/lib/utils (样式工具)
 * - @/lib/password-utils (密码处理工具)
 *
 * @security
 * - 防止XSS注入：使用受控输入和安全的事件处理
 * - 内容转义：React自动处理内容转义
 * - 安全的状态切换：使用React状态管理，避免DOM操作
 * - 空格处理：自动去除前导/尾随空格，可选阻止空格输入
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2025-07-03: 添加空格处理功能
 */

"use client";

import React, { useState, forwardRef, useCallback } from "react";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  handlePasswordInput,
  handlePasswordKeyDown,
  handlePasswordPaste,
  DEFAULT_PASSWORD_SPACE_CONFIG,
  type PasswordSpaceConfig,
} from "@/lib/password-utils";

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  autoComplete?: string;
  // 空格处理配置
  preventSpaces?: boolean;
  showSpaceWarning?: boolean;
  onSpaceWarning?: (warning: string) => void;
  spaceConfig?: Partial<PasswordSpaceConfig>;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "请输入密码",
      className,
      disabled = false,
      error = false,
      autoComplete = "current-password",
      preventSpaces = true,
      showSpaceWarning = true,
      onSpaceWarning,
      spaceConfig,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [spaceWarning, setSpaceWarning] = useState<string>("");

    // 合并空格处理配置
    const finalSpaceConfig: PasswordSpaceConfig = {
      ...DEFAULT_PASSWORD_SPACE_CONFIG,
      preventSpaceInput: preventSpaces,
      showSpaceWarning,
      ...spaceConfig,
    };

    // 安全的切换显示状态函数
    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev);
    };

    // 处理空格警告
    const handleSpaceWarningCallback = useCallback((warning: string) => {
      setSpaceWarning(warning);
      onSpaceWarning?.(warning);

      // 3秒后清除警告
      setTimeout(() => {
        setSpaceWarning("");
      }, 3000);
    }, [onSpaceWarning]);

    // 处理输入变化
    const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      const result = handlePasswordInput(event, finalSpaceConfig);

      if (result.warnings.length > 0) {
        handleSpaceWarningCallback(result.warnings[0]);
      }

      if (result.shouldPreventDefault) {
        // 创建新的事件对象，使用处理后的值
        const newEvent = {
          ...event,
          target: {
            ...event.target,
            value: result.processedValue,
          },
        };
        onChange?.(newEvent as React.ChangeEvent<HTMLInputElement>);
      } else {
        onChange?.(event);
      }
    }, [onChange, finalSpaceConfig, handleSpaceWarningCallback]);

    // 处理键盘事件
    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
      const result = handlePasswordKeyDown(event, finalSpaceConfig);

      if (result.shouldPreventDefault) {
        event.preventDefault();
        if (result.warning) {
          handleSpaceWarningCallback(result.warning);
        }
      }
    }, [finalSpaceConfig, handleSpaceWarningCallback]);

    // 处理粘贴事件
    const handlePaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
      const result = handlePasswordPaste(event, finalSpaceConfig);

      if (result.shouldPreventDefault) {
        event.preventDefault();

        // 手动设置值
        const newEvent = {
          target: {
            value: result.processedValue,
          },
        } as React.ChangeEvent<HTMLInputElement>;

        onChange?.(newEvent);

        if (result.warnings.length > 0) {
          handleSpaceWarningCallback(result.warnings[0]);
        }
      }
    }, [onChange, finalSpaceConfig, handleSpaceWarningCallback]);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          {...props}
          className={cn(
            // 基础样式
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            // 占位符样式
            "placeholder:text-muted-foreground",
            // 焦点样式
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            // 禁用样式
            "disabled:cursor-not-allowed disabled:opacity-50",
            // 为图标留出空间
            "pr-10",
            // 错误状态样式
            error && "border-red-500 focus-visible:ring-red-500",
            // 警告状态样式
            spaceWarning && "border-yellow-500 focus-visible:ring-yellow-500",
            // 自定义样式
            className
          )}
        />

        {/* 显示/隐藏密码按钮 */}
        <button
          type="button"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className={cn(
            // 基础定位和样式
            "absolute inset-y-0 right-0 flex items-center justify-center w-10",
            // 交互样式
            "text-gray-400 hover:text-gray-600 focus:text-gray-600",
            // 焦点样式
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md",
            // 禁用样式
            "disabled:cursor-not-allowed disabled:opacity-50",
            // 过渡效果
            "transition-colors duration-200"
          )}
          aria-label={showPassword ? "隐藏密码" : "显示密码"}
          tabIndex={disabled ? -1 : 0}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        {/* 空格警告提示 */}
        {spaceWarning && showSpaceWarning && (
          <div className="absolute top-full left-0 right-0 mt-1 z-10">
            <div className="flex items-center gap-1 px-2 py-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md shadow-sm">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" />
              <span>{spaceWarning}</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
