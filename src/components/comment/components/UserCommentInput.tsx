/**
 * @fileoverview 用户评论输入组件
 * @description 注册用户的评论输入界面，支持@提及功能
 */

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { EnhancedMentionInput } from "@/components/ui/enhanced-mention-input";
import { Send, Loader2 } from "lucide-react";

export interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  isPending?: boolean;
}

/**
 * 注册用户评论输入组件
 */
export function UserCommentInput({
  onSubmit,
  placeholder = "写下你的评论...",
  isPending = false
}: CommentInputProps) {
  const [content, setContent] = useState("");
  const { data: session } = useSession();

  const handleSubmit = () => {
    if (!content.trim() || isPending) return;

    onSubmit(content);
    setContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown}>
      <EnhancedMentionInput
        value={content}
        onChange={(value: string) => setContent(value)}
        placeholder={placeholder}
        disabled={isPending}
        className="min-h-[80px]"
      />
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          支持 @用户名 提及其他用户，Ctrl+Enter 快速发送
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isPending}
          size="sm"
          className="flex items-center gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          发送评论
        </Button>
      </div>
    </div>
  );
}
