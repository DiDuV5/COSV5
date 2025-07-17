/**
 * @fileoverview 评论输入区组件
 * @description 根据用户状态显示不同的评论输入界面
 */

"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, AlertCircle } from "lucide-react";
import { UserCommentInput } from "./UserCommentInput";
import { GuestCommentForm, type GuestCommentData } from "../guest-comment-form";

export interface CommentInputSectionProps {
  allowGuestComments?: boolean;
  onUserCommentSubmit: (content: string) => void;
  onGuestCommentSubmit: (data: GuestCommentData) => void;
  isPending?: boolean;
}

/**
 * 评论输入区组件
 */
export function CommentInputSection({
  allowGuestComments = false,
  onUserCommentSubmit,
  onGuestCommentSubmit,
  isPending = false,
}: CommentInputSectionProps) {
  const { data: session } = useSession();

  // 注册用户评论界面
  if (session?.user) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          以 {session.user.name || session.user.username} 身份评论
        </div>
        <UserCommentInput
          onSubmit={onUserCommentSubmit}
          isPending={isPending}
        />
      </div>
    );
  }

  // 游客评论界面
  if (allowGuestComments) {
    return (
      <Tabs defaultValue="guest" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="guest">游客评论</TabsTrigger>
          <TabsTrigger value="login">登录评论</TabsTrigger>
        </TabsList>
        <TabsContent value="guest" className="mt-4">
          <GuestCommentForm
            onSubmit={onGuestCommentSubmit}
            isPending={isPending}
          />
        </TabsContent>
        <TabsContent value="login" className="mt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              登录后可以享受更多功能：免审核评论、点赞互动、获得罐头奖励等。
              <Button variant="link" className="p-0 h-auto ml-1">
                立即登录
              </Button>
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    );
  }

  // 不允许游客评论
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        请登录后参与评论讨论。
        <Button variant="link" className="p-0 h-auto ml-1">
          立即登录
        </Button>
      </AlertDescription>
    </Alert>
  );
}
