/**
 * @fileoverview 表单消息组件
 * @description 显示表单的错误和成功消息
 * @author Augment AI
 * @date 2025-07-09
 * @version 1.0.0
 */

"use client";

interface FormMessagesProps {
  error?: string;
  success?: string;
}

export function FormMessages({ error, success }: FormMessagesProps) {
  return (
    <>
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* 成功提示 */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
          {success}
        </div>
      )}
    </>
  );
}
