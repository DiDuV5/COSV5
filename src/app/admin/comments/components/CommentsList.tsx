/**
 * @fileoverview 评论列表组件
 * @description 显示最新、热门、点踩评论列表
 */

"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  TrendingUp,
  ThumbsDown,
  Loader2,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { AdminComment } from "../types";
import { getUserLevelName, getContentTypeName, truncateContent } from "../utils";

interface CommentsListProps {
  latestComments?: AdminComment[];
  hotComments?: AdminComment[];
  dislikedComments?: AdminComment[];
  isLoadingLatest: boolean;
  isLoadingHot: boolean;
  isLoadingDisliked: boolean;
  onCommentAction: (_action: string, _commentId: string, data?: any) => void;
}

export function CommentsList({
  latestComments,
  hotComments,
  dislikedComments,
  isLoadingLatest,
  isLoadingHot,
  isLoadingDisliked,
  onCommentAction,
}: CommentsListProps) {
  const renderCommentItem = (comment: AdminComment, index?: number, showHotScore?: boolean) => (
    <div key={comment.id} className="p-4 border rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {typeof index === 'number' && (
            <Badge variant="outline" className={showHotScore ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700"}>
              #{index + 1}
            </Badge>
          )}
          {comment.author ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {getUserLevelName(comment.author.userLevel)}
              </Badge>
              <span className="font-medium">
                {comment.author.displayName || comment.author.username}
              </span>
              {comment.author.isVerified && (
                <UserCheck className="h-4 w-4 text-blue-500" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline">游客</Badge>
              <span className="font-medium">{comment.guestName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {showHotScore && comment.hotScore && (
            <span>热度: {comment.hotScore}</span>
          )}
          <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: zhCN })}</span>
          {comment.post && (
            <Link
              href={`/posts/${comment.post.id}`}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-3 w-3" />
              查看原文
            </Link>
          )}
        </div>
      </div>
      <p className="text-gray-700 mb-2">
        {truncateContent(comment.content, 100)}
      </p>
      {comment.post && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          来自{getContentTypeName(comment.post.contentType)}：{comment.post.title} -
          作者：{comment.post.author.displayName || comment.post.author.username}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>👍 {comment.likeCount}</span>
          {comment.dislikeCount > 0 && (
            <span className="text-red-600 font-medium">👎 {comment.dislikeCount}</span>
          )}
          <span>💬 {comment.replyCount}</span>
          <Badge variant={comment.status === "APPROVED" ? "default" : comment.status === "PENDING" ? "secondary" : "destructive"}>
            {comment.status === "APPROVED" ? "已通过" : comment.status === "PENDING" ? "待审核" : "已拒绝"}
          </Badge>
        </div>
        {/* 快捷管理按钮 */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCommentAction("TOGGLE_PIN", comment.id)}
            className="h-7 px-2 text-xs"
          >
            {comment.isPinned ? "取消置顶" : "置顶"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCommentAction("DELETE", comment.id, { reason: "管理员删除" })}
            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            删除
          </Button>
        </div>
      </div>
    </div>
  );

  const renderLoadingState = () => (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="ml-2">加载中...</span>
    </div>
  );

  const renderEmptyState = (message: string) => (
    <div className="text-center py-8 text-gray-500">
      {message}
    </div>
  );

  return (
    <Tabs defaultValue="latest" className="space-y-4">
      <TabsList>
        <TabsTrigger value="latest" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          最新评论
        </TabsTrigger>
        <TabsTrigger value="hot" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          热门评论
        </TabsTrigger>
        <TabsTrigger value="disliked" className="flex items-center gap-2">
          <ThumbsDown className="h-4 w-4" />
          最多点踩
        </TabsTrigger>
      </TabsList>

      {/* 最新评论 */}
      <TabsContent value="latest">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>最新评论 (前20条)</span>
              <Badge variant="outline">
                {latestComments?.length || 0} 条
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingLatest ? (
              renderLoadingState()
            ) : latestComments && latestComments.length > 0 ? (
              <div className="space-y-4">
                {latestComments.map((comment) => renderCommentItem(comment))}
              </div>
            ) : (
              renderEmptyState("暂无评论数据")
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 热门评论 */}
      <TabsContent value="hot">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>热门评论 (按点赞数排序)</span>
              <Badge variant="outline">
                {hotComments?.length || 0} 条
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHot ? (
              renderLoadingState()
            ) : hotComments && hotComments.length > 0 ? (
              <div className="space-y-4">
                {hotComments.map((comment, index) => renderCommentItem(comment, index, true))}
              </div>
            ) : (
              renderEmptyState("暂无热门评论")
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 最多点踩评论 */}
      <TabsContent value="disliked">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>最多点踩评论</span>
              <Badge variant="outline">
                {dislikedComments?.length || 0} 条
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDisliked ? (
              renderLoadingState()
            ) : dislikedComments && dislikedComments.length > 0 ? (
              <div className="space-y-4">
                {dislikedComments.map((comment, index) => (
                  <div key={comment.id} className="p-4 border rounded-lg border-red-200">
                    {renderCommentItem(comment, index)}
                  </div>
                ))}
              </div>
            ) : (
              renderEmptyState("暂无被点踩的评论")
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
