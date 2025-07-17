/**
 * @component MarkdownEditor
 * @description Markdown 编辑器组件，支持实时预览
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - value: string - 当前内容
 * - onChange: (value: string) => void - 内容变化回调
 * - placeholder?: string - 占位符文本
 * - maxLength?: number - 最大字符数
 * - rows?: number - 文本框行数
 *
 * @example
 * <MarkdownEditor
 *   value={content}
 *   onChange={setContent}
 *   placeholder="输入内容..."
 *   maxLength={5000}
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
import { Eye, Edit, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
  showHelp?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "输入内容...",
  maxLength = 5000,
  rows = 6,
  className,
  showHelp = true,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false);

  const markdownHelp = [
    { syntax: "# 标题", description: "一级标题" },
    { syntax: "## 标题", description: "二级标题" },
    { syntax: "**粗体**", description: "粗体文本" },
    { syntax: "*斜体*", description: "斜体文本" },
    { syntax: "[链接](URL)", description: "链接" },
    { syntax: "![图片](URL)", description: "图片" },
    { syntax: "`代码`", description: "行内代码" },
    { syntax: "```代码块```", description: "代码块" },
    { syntax: "- 列表项", description: "无序列表" },
    { syntax: "1. 列表项", description: "有序列表" },
    { syntax: "> 引用", description: "引用文本" },
    { syntax: "---", description: "分隔线" },
  ];

  return (
    <div className={cn("w-full", className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
        <div className="flex items-center justify-between mb-2">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              编辑
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              预览
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {value.length}/{maxLength}
            </span>
            {showHelp && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowMarkdownHelp(!showMarkdownHelp)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="edit" className="mt-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            className="font-mono text-sm"
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <Card>
            <CardContent className="p-4 min-h-[200px]">
              {value.trim() ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeHighlight, rehypeRaw]}
                    components={{
                      // 自定义组件渲染
                      h1: ({ children }) => (
                        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
                          {children}
                        </p>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                        >
                          {children}
                        </a>
                      ),
                      code: ({ children, className }) => {
                        const isInline = !className;
                        return isInline ? (
                          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        ) : (
                          <code className={className}>{children}</code>
                        );
                      },
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-4">
                          {children}
                        </blockquote>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-4 space-y-1">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-4 space-y-1">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-gray-700 dark:text-gray-300">
                          {children}
                        </li>
                      ),
                    }}
                  >
                    {value}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>预览将在这里显示</p>
                  <p className="text-sm">支持 Markdown 语法</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Markdown 语法帮助 */}
      {showMarkdownHelp && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Markdown 语法帮助
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {markdownHelp.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {item.syntax}
                  </Badge>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.description}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
