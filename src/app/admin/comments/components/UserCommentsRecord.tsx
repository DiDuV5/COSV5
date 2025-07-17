/**
 * @fileoverview 用户评论记录组件
 * @description 查询和显示特定用户的评论记录
 */

"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, Loader2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { AdminComment } from "../types";
import { getCommentStatusInfo, getContentTypeName } from "../utils";

interface UserCommentsRecordProps {
  userSearchQuery: string;
  onUserSearchQueryChange: (query: string) => void;
  onUserSearch: () => void;
  userCommentsData?: {
    comments: AdminComment[];
  };
  isLoadingUserComments: boolean;
}

export function UserCommentsRecord({
  userSearchQuery,
  onUserSearchQueryChange,
  onUserSearch,
  userCommentsData,
  isLoadingUserComments,
}: UserCommentsRecordProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onUserSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* 搜索表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            用户评论记录查询
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">用户名搜索</label>
              <Input
                placeholder="输入用户名进行搜索..."
                value={userSearchQuery}
                onChange={(e) => onUserSearchQueryChange(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
            <Button 
              onClick={onUserSearch} 
              disabled={!userSearchQuery.trim()}
            >
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 搜索结果 */}
      {userSearchQuery && (
        <Card>
          <CardHeader>
            <CardTitle>
              用户 &ldquo;{userSearchQuery}&rdquo; 的评论记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingUserComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">加载用户评论中...</span>
              </div>
            ) : userCommentsData?.comments && userCommentsData.comments.length > 0 ? (
              <div className="space-y-4">
                {userCommentsData.comments.map((comment) => {
                  const statusInfo = getCommentStatusInfo(comment.status);
                  
                  return (
                    <div key={comment.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={statusInfo.variant}
                            className={`${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor}`}
                          >
                            {statusInfo.label}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { 
                              addSuffix: true, 
                              locale: zhCN 
                            })}
                          </span>
                        </div>
                        {comment.post && (
                          <Link
                            href={`/posts/${comment.post.id}`}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <ExternalLink className="h-3 w-3" />
                            查看原文
                          </Link>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-2">{comment.content}</p>
                      
                      {comment.post && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-2">
                          来自{getContentTypeName(comment.post.contentType)}：{comment.post.title}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>👍 {comment.likeCount}</span>
                        <span>💬 {comment.replyCount}</span>
                        {comment.dislikeCount > 0 && (
                          <span className="text-red-600">👎 {comment.dislikeCount}</span>
                        )}
                      </div>
                      
                      {/* 显示拒绝原因 */}
                      {comment.status === "REJECTED" && comment.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <span className="font-medium text-red-800">拒绝原因：</span>
                          <span className="text-red-700">{comment.rejectionReason}</span>
                        </div>
                      )}
                      
                      {/* 显示审核时间 */}
                      {comment.reviewedAt && (
                        <div className="mt-2 text-xs text-gray-500">
                          审核时间：{formatDistanceToNow(new Date(comment.reviewedAt), { 
                            addSuffix: true, 
                            locale: zhCN 
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : userSearchQuery ? (
              <div className="text-center py-8 text-gray-500">
                用户 &ldquo;{userSearchQuery}&rdquo; 暂无评论记录
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
