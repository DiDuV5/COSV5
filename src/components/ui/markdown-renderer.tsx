/**
 * @component MarkdownRenderer
 * @description Markdown 内容渲染组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - content: string - 要渲染的 Markdown 内容
 * - className?: string - 自定义样式类名
 * - maxLength?: number - 内容截断长度
 * - showReadMore?: boolean - 是否显示"阅读更多"按钮
 *
 * @example
 * <MarkdownRenderer
 *   content={post.content}
 *   maxLength={500}
 *   showReadMore={true}
 * />
 *
 * @dependencies
 * - React 18+
 * - react-markdown
 * - remark-gfm
 * - rehype-highlight
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  maxLength?: number;
  showReadMore?: boolean;
}

export function MarkdownRenderer({
  content,
  className,
  maxLength,
  showReadMore = false,
}: MarkdownRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content?.trim()) {
    return null;
  }

  // 处理内容截断
  const shouldTruncate = maxLength && content.length > maxLength && showReadMore;
  const displayContent = shouldTruncate && !isExpanded
    ? content.slice(0, maxLength) + "..."
    : content;

  return (
    <div className={cn("w-full", className)}>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          components={{
            // 标题组件
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100 mt-6">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100 mt-4">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-base font-medium mb-2 text-gray-900 dark:text-gray-100 mt-3">
                {children}
              </h4>
            ),

            // 段落和文本
            p: ({ children }) => (
              <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                {children}
              </p>
            ),

            // 链接
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-blue-600/30 hover:decoration-blue-600 transition-colors"
              >
                {children}
              </a>
            ),

            // 代码
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                  {children}
                </code>
              ) : (
                <code className={cn("block", className)}>{children}</code>
              );
            },

            // 代码块
            pre: ({ children }) => (
              <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-x-auto my-4">
                {children}
              </pre>
            ),

            // 引用
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 pl-4 pr-4 py-2 italic text-gray-700 dark:text-gray-300 my-4 rounded-r">
                {children}
              </blockquote>
            ),

            // 列表
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">{children}</li>
            ),

            // 表格
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </tbody>
            ),
            tr: ({ children }) => <tr>{children}</tr>,
            th: ({ children }) => (
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                {children}
              </td>
            ),

            // 分隔线
            hr: () => (
              <hr className="my-6 border-gray-200 dark:border-gray-700" />
            ),

            // 图片
            img: ({ src, alt }) => {
              if (!src) return null;

              return (
                <div className="relative my-4 max-w-full overflow-hidden rounded-lg shadow-sm">
                  <Image
                    src={src}
                    alt={alt || ""}
                    width={800}
                    height={600}
                    className="max-w-full h-auto"
                    style={{ width: '100%', height: 'auto' }}
                    priority={false}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                  />
                </div>
              );
            },

            // 强调
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-900 dark:text-gray-100">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-800 dark:text-gray-200">
                {children}
              </em>
            ),

            // 删除线
            del: ({ children }) => (
              <del className="line-through text-gray-500 dark:text-gray-400">
                {children}
              </del>
            ),
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>

      {/* 展开/收起按钮 */}
      {shouldTruncate && (
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                阅读更多
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
