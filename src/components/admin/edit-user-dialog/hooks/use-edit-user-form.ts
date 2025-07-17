/**
 * @fileoverview 编辑用户表单Hook
 * @description 管理编辑用户表单的状态和逻辑
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/trpc/react";
import { createEditUserSchema, type EditUserFormData } from "../types";
import { cleanFormData } from "../utils";

interface UseEditUserFormProps {
  userId: string | null;
  user: any;
  usernameMinLength: number;
  onSuccess: () => void;
  onOpenChange: (open: boolean) => void;
}

export function useEditUserForm({
  userId,
  user,
  usernameMinLength,
  onSuccess,
  onOpenChange,
}: UseEditUserFormProps) {
  // 编辑表单
  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(createEditUserSchema(usernameMinLength)),
    defaultValues: {
      username: "",
      email: "",
      displayName: "",
      bio: "",
      userLevel: "USER",
      isVerified: false,
      isActive: true,
      canPublish: false,
      avatarUrl: "",
    },
  });

  // 更新用户 mutation
  const updateUser = api.admin.updateUser.useMutation({
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      editForm.setError("root", {
        type: "manual",
        message: error.message,
      });
    },
  });

  // 当用户数据加载完成时，更新表单默认值
  useEffect(() => {
    if (user) {
      editForm.reset({
        username: user.username,
        email: user.email || "",
        displayName: user.displayName || "",
        bio: user.bio || "",
        userLevel: user.userLevel as any,
        isVerified: user.isVerified,
        isActive: user.isActive,
        canPublish: user.canPublish,
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user, editForm]);

  const onSubmit = async (data: EditUserFormData) => {
    if (!userId) return;
    
    const cleanData = cleanFormData(data, userId);
    updateUser.mutate(cleanData);
  };

  return {
    editForm,
    onSubmit,
    isPending: updateUser.isPending,
  };
}
