/**
 * @component PasswordStrength
 * @description 密码强度检查组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - password: string - 要检查的密码
 * - showDetails?: boolean - 是否显示详细要求
 *
 * @example
 * <PasswordStrength
 *   password={password}
 *   showDetails={true}
 * />
 *
 * @dependencies
 * - React 18+
 * - Lucide React (图标)
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

interface PasswordStrengthProps {
  password: string;
  showDetails?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

export function PasswordStrength({ password, showDetails = true }: PasswordStrengthProps) {
  // 获取系统设置
  const { data: publicSettings } = api.settings.getPublicSettings.useQuery();

  // 根据系统设置动态生成密码要求
  const getPasswordRequirements = (): PasswordRequirement[] => {
    const requirements: PasswordRequirement[] = [];

    // 密码长度要求（总是存在）
    const minLength = publicSettings?.passwordMinLength || 6;
    requirements.push({
      label: `至少 ${minLength} 个字符`,
      test: (password) => password.length >= minLength,
    });

    // 根据系统设置添加其他要求
    if (publicSettings?.passwordRequireUppercase) {
      requirements.push({
        label: "包含大写字母",
        test: (password) => /[A-Z]/.test(password),
      });
    }

    if (publicSettings?.passwordRequireLowercase) {
      requirements.push({
        label: "包含小写字母",
        test: (password) => /[a-z]/.test(password),
      });
    }

    if (publicSettings?.passwordRequireNumbers) {
      requirements.push({
        label: "包含数字",
        test: (password) => /\d/.test(password),
      });
    }

    if (publicSettings?.passwordRequireSymbols) {
      requirements.push({
        label: "包含特殊字符",
        test: (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
      });
    }

    return requirements;
  };

  const passwordRequirements = getPasswordRequirements();
  const passedRequirements = passwordRequirements.filter(req => req.test(password));
  const strength = passedRequirements.length;
  
  const getStrengthLevel = () => {
    const totalRequirements = passwordRequirements.length;
    const percentage = totalRequirements > 0 ? strength / totalRequirements : 0;

    if (percentage < 0.5) return { level: "弱", color: "text-red-600", bgColor: "bg-red-200" };
    if (percentage < 0.8) return { level: "中等", color: "text-yellow-600", bgColor: "bg-yellow-200" };
    if (percentage < 1) return { level: "强", color: "text-blue-600", bgColor: "bg-blue-200" };
    return { level: "很强", color: "text-green-600", bgColor: "bg-green-200" };
  };

  const strengthInfo = getStrengthLevel();

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* 强度指示器 */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">密码强度:</span>
        <span className={cn("text-sm font-medium", strengthInfo.color)}>
          {strengthInfo.level}
        </span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={cn("h-2 rounded-full transition-all duration-300", strengthInfo.bgColor)}
            style={{
              width: `${passwordRequirements.length > 0 ? (strength / passwordRequirements.length) * 100 : 0}%`
            }}
          />
        </div>
      </div>

      {/* 详细要求 */}
      {showDetails && (
        <div className="space-y-1">
          {passwordRequirements.map((requirement, index) => {
            const passed = requirement.test(password);
            return (
              <div key={index} className="flex items-center space-x-2 text-xs">
                {passed ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <X className="h-3 w-3 text-gray-400" />
                )}
                <span className={cn(
                  passed ? "text-green-600" : "text-gray-500"
                )}>
                  {requirement.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
