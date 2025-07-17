/**
 * @fileoverview 用户头像区域组件
 * @description 显示用户头像和基本信息
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { UserAvatarSectionProps } from "../types";

export function UserAvatarSection({ user }: UserAvatarSectionProps) {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <div className="relative">
        <Image
          src={user.avatarUrl || "/default-avatar.png"}
          alt={user.displayName || user.username}
          width={64}
          height={64}
          className="rounded-full"
        />
        {user.isVerified && (
          <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold">{user.displayName || user.username}</h3>
        <p className="text-sm text-gray-500">@{user.username}</p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={user.isActive ? "default" : "destructive"}>
            {user.isActive ? "活跃" : "已禁用"}
          </Badge>
          <Badge variant="outline">{user.userLevel}</Badge>
          {user.canPublish && <Badge variant="secondary">可发布</Badge>}
        </div>
      </div>
    </div>
  );
}
