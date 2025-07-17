/**
 * @fileoverview 用户统计标签页组件
 * @description 显示用户统计信息和最近活动
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import type { UserStatsTabProps } from "../types";
import { formatDate } from "../utils";

export function UserStatsTab({ user }: UserStatsTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900">发布内容</h4>
          <p className="text-2xl font-bold text-blue-600">{user._count.posts}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900">评论数</h4>
          <p className="text-2xl font-bold text-green-600">{user._count.comments}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-medium text-purple-900">获赞数</h4>
          <p className="text-2xl font-bold text-purple-600">{user._count.likes}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <h4 className="font-medium text-orange-900">关注数</h4>
          <p className="text-2xl font-bold text-orange-600">{user._count.following}</p>
        </div>
        <div className="bg-pink-50 p-4 rounded-lg">
          <h4 className="font-medium text-pink-900">粉丝数</h4>
          <p className="text-2xl font-bold text-pink-600">{user._count.followers}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">账户信息</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">注册时间:</span>
            <span className="ml-2">{formatDate(user.createdAt)}</span>
          </div>
          <div>
            <span className="text-gray-500">最后登录:</span>
            <span className="ml-2">{formatDate(user.lastLoginAt)}</span>
          </div>
          <div>
            <span className="text-gray-500">更新时间:</span>
            <span className="ml-2">{formatDate(user.updatedAt)}</span>
          </div>

        </div>
      </div>

      {/* 最近发布的内容 */}
      {user.posts && user.posts.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium">最近发布</h4>
          <div className="space-y-2">
            {user.posts.map((post: any) => (
              <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{post.title}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Badge variant="outline">{post.contentType}</Badge>
                    <Badge variant="outline">{post.visibility}</Badge>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
