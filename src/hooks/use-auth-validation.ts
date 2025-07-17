/**
 * @fileoverview 认证表单验证 Hook
 * @description 提供实时的用户名和邮箱验证功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/react-query: ^10.45.0
 * - react: ^18.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";

interface ValidationState {
  isChecking: boolean;
  isValid: boolean;
  message: string;
}

export function useUsernameValidation(username: string, debounceMs = 500, minLength = 5) {
  const [state, setState] = useState<ValidationState>({
    isChecking: false,
    isValid: false,
    message: "",
  });

  const checkUsername = api.auth.checkUsername.useQuery(
    { username },
    {
      enabled: false, // 手动触发
      retry: false,
    }
  );

  useEffect(() => {
    if (!username || username.length < minLength) {
      setState({
        isChecking: false,
        isValid: false,
        message: username.length > 0 && username.length < minLength ? `用户名至少${minLength}个字符` : "",
      });
      return;
    }

    // 基本格式验证
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setState({
        isChecking: false,
        isValid: false,
        message: "用户名只能包含字母、数字和下划线",
      });
      return;
    }

    setState(prev => ({ ...prev, isChecking: true }));

    const timer = setTimeout(() => {
      checkUsername.refetch().then((result) => {
        if (result.data) {
          setState({
            isChecking: false,
            isValid: result.data.available,
            message: result.data.message,
          });
        }
      }).catch(() => {
        setState({
          isChecking: false,
          isValid: false,
          message: "检查用户名时发生错误",
        });
      });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [username, debounceMs]); // 移除 checkUsername 依赖

  return state;
}

export function useEmailValidation(email: string, debounceMs = 500) {
  const [state, setState] = useState<ValidationState>({
    isChecking: false,
    isValid: false,
    message: "",
  });

  const checkEmail = api.auth.checkEmail.useQuery(
    { email },
    {
      enabled: false, // 手动触发
      retry: false,
    }
  );

  useEffect(() => {
    if (!email) {
      setState({
        isChecking: false,
        isValid: true, // 邮箱是可选的
        message: "",
      });
      return;
    }

    // 基本邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setState({
        isChecking: false,
        isValid: false,
        message: "请输入有效的邮箱地址",
      });
      return;
    }

    setState(prev => ({ ...prev, isChecking: true }));

    const timer = setTimeout(() => {
      checkEmail.refetch().then((result) => {
        if (result.data) {
          setState({
            isChecking: false,
            isValid: result.data.available,
            message: result.data.message,
          });
        }
      }).catch(() => {
        setState({
          isChecking: false,
          isValid: false,
          message: "检查邮箱时发生错误",
        });
      });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [email, debounceMs]); // 移除 checkEmail 依赖

  return state;
}

export function usePasswordStrength(password: string) {
  const [strength, setStrength] = useState({
    score: 0,
    level: "弱",
    color: "text-red-600",
    bgColor: "bg-red-200",
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  });

  useEffect(() => {
    const requirements = {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;

    let level = "弱";
    let color = "text-red-600";
    let bgColor = "bg-red-200";

    if (score <= 1) {
      level = "弱";
      color = "text-red-600";
      bgColor = "bg-red-200";
    } else if (score <= 3) {
      level = "中等";
      color = "text-yellow-600";
      bgColor = "bg-yellow-200";
    } else if (score <= 4) {
      level = "强";
      color = "text-blue-600";
      bgColor = "bg-blue-200";
    } else {
      level = "很强";
      color = "text-green-600";
      bgColor = "bg-green-200";
    }

    setStrength({
      score,
      level,
      color,
      bgColor,
      requirements,
    });
  }, [password]);

  return strength;
}
