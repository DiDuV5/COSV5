/**
 * @fileoverview 密码重置表单Hook
 * @description 管理密码重置表单的状态和逻辑
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/trpc/react";
import { resetPasswordSchema, type ResetPasswordFormData } from "../types";

interface UsePasswordResetFormProps {
  userId: string | null;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

export function usePasswordResetForm({
  userId,
  onSuccess,
  onOpenChange,
}: UsePasswordResetFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 密码重置表单
  const passwordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // 重置密码 mutation
  const resetPassword = {
    mutate: (data: { userId: string; newPassword: string }) => {
      console.log('重置用户密码:', data);
      onSuccess();
      onOpenChange(false);
      passwordForm.reset();
    },
    isPending: false
  };

  const onPasswordSubmit = async (data: ResetPasswordFormData) => {
    if (!userId) return;
    
    resetPassword.mutate({
      userId,
      newPassword: data.newPassword,
    });
  };

  return {
    passwordForm,
    showPassword,
    showConfirmPassword,
    onPasswordSubmit,
    isPending: resetPassword.isPending,
    togglePassword: () => setShowPassword(!showPassword),
    toggleConfirmPassword: () => setShowConfirmPassword(!showConfirmPassword),
  };
}
