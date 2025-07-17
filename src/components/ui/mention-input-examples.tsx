/**
 * @fileoverview MentionInput组件使用示例和集成指南
 * @description 展示如何在不同场景中使用智能@用户提及输入组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - @trpc/react-query
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import React, { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MentionInput, type MentionInputRef, type UserSuggestion } from './mention-input';
import { MentionRenderer } from './mention-renderer';
import {
  MessageCircle,
  Send,
  Edit3,
  FileText,
  Users,
  AlertTriangle
} from 'lucide-react';

export function MentionInputExamples() {
  const { data: session } = useSession();
  const [postContent, setPostContent] = useState('');
  const [momentContent, setMomentContent] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  
  // 组件引用
  const postInputRef = useRef<MentionInputRef>(null);
  const momentInputRef = useRef<MentionInputRef>(null);
  const commentInputRef = useRef<MentionInputRef>(null);
  const replyInputRef = useRef<MentionInputRef>(null);

  // 处理用户选择
  const handleMentionSelect = (user: UserSuggestion, context: string) => {
    console.log(`用户选择了 @${user.displayName || user.username} 在 ${context} 中`);
  };

  // 处理冲突解决
  const handleConflictResolve = (users: UserSuggestion[], context: string) => {
    console.log(`在 ${context} 中发现用户名冲突，候选用户:`, users);
  };

  // 发布作品示例
  const handlePublishPost = () => {
    if (!postContent.trim()) return;
    console.log('发布作品:', postContent);
    setPostContent('');
  };

  // 发布动态示例
  const handlePublishMoment = () => {
    if (!momentContent.trim()) return;
    console.log('发布动态:', momentContent);
    setMomentContent('');
  };

  // 发布评论示例
  const handlePublishComment = () => {
    if (!commentContent.trim()) return;
    console.log('发布评论:', commentContent);
    setCommentContent('');
  };

  // 发布回复示例
  const handlePublishReply = () => {
    if (!replyContent.trim()) return;
    console.log('发布回复:', replyContent);
    setReplyContent('');
  };

  // 插入快捷文本
  const insertQuickText = (text: string, inputRef: React.RefObject<MentionInputRef>) => {
    inputRef.current?.insertText(text);
  };

  return (
    <div className="space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">MentionInput 使用示例</h1>
        <p className="text-gray-600">智能@用户提及输入组件的各种使用场景</p>
      </div>

      {/* 1. 发布作品场景 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            发布作品
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MentionInput
            ref={postInputRef}
            value={postContent}
            onChange={setPostContent}
            placeholder="分享你的cosplay作品，@提及朋友一起欣赏..."
            maxLength={2000}
            rows={6}
            onMentionSelect={(user) => handleMentionSelect(user, '作品发布')}
          />
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertQuickText('感谢大家的支持！', postInputRef)}
              >
                快捷文本
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertQuickText('@斗鱼官方 ', postInputRef)}
              >
                @官方
              </Button>
            </div>
            <Button onClick={handlePublishPost} disabled={!postContent.trim()}>
              <Send className="h-4 w-4 mr-2" />
              发布作品
            </Button>
          </div>

          {/* 预览 */}
          {postContent && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">预览效果:</h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                <MentionRenderer
                  content={postContent}
                  enableUserCard={true}
                  enableTagLinks={true}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. 发布动态场景 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            发布动态
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MentionInput
            ref={momentInputRef}
            value={momentContent}
            onChange={setMomentContent}
            placeholder="分享你的日常动态，@朋友们一起互动..."
            maxLength={500}
            rows={3}
            onMentionSelect={(user) => handleMentionSelect(user, '动态发布')}
          />
          
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                动态模式
              </Badge>
              <Badge variant="outline" className="text-xs">
                500字限制
              </Badge>
            </div>
            <Button onClick={handlePublishMoment} disabled={!momentContent.trim()}>
              发布动态
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. 评论场景 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            评论互动
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MentionInput
            ref={commentInputRef}
            value={commentContent}
            onChange={setCommentContent}
            placeholder="发表你的评论，@提及其他用户参与讨论..."
            maxLength={1000}
            rows={2}
            onMentionSelect={(user) => handleMentionSelect(user, '评论')}
          />
          
          <Button onClick={handlePublishComment} disabled={!commentContent.trim()}>
            发表评论
          </Button>
        </CardContent>
      </Card>

      {/* 4. 回复场景 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            回复评论
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-sm">
            <strong>@用户A:</strong> 这个cosplay太棒了！
          </div>
          
          <MentionInput
            ref={replyInputRef}
            value={replyContent}
            onChange={setReplyContent}
            placeholder="回复 @用户A..."
            maxLength={500}
            rows={2}
            onMentionSelect={(user) => handleMentionSelect(user, '回复')}
          />
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => insertQuickText('@用户A ', replyInputRef)}
            >
              @原评论者
            </Button>
            <Button onClick={handlePublishReply} disabled={!replyContent.trim()}>
              回复
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. 功能特性说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            功能特性
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">核心功能</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 实时用户搜索（300ms防抖）</li>
                <li>• 智能冲突处理</li>
                <li>• 键盘导航支持</li>
                <li>• 触摸友好设计</li>
                <li>• 自动补全建议</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">用户体验</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 优先显示关注用户</li>
                <li>• 显示用户等级徽章</li>
                <li>• 支持displayName显示</li>
                <li>• 5分钟搜索缓存</li>
                <li>• 响应式设计</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MentionInputExamples;
