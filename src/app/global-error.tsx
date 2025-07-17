/**
 * @fileoverview 全局错误页面
 * @description 处理应用程序级别的错误，避免Html组件导入错误
 * @author Augment AI
 * @date 2025-07-17
 * @version 1.0.0
 */

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台
    console.error("全局错误:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <div className="mb-4">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  应用程序错误
                </CardTitle>
                <CardDescription className="text-gray-600">
                  应用程序遇到了一个意外错误
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 错误详情 */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">错误信息:</span> {error.message}
                    </p>
                    {error.digest && (
                      <p className="text-sm text-red-700 mt-1">
                        <span className="font-medium">错误ID:</span> {error.digest}
                      </p>
                    )}
                  </div>
                )}

                {/* 解决建议 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">您可以尝试:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2 text-sm text-gray-600">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>刷新页面重新加载</span>
                    </li>
                    <li className="flex items-start space-x-2 text-sm text-gray-600">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>清除浏览器缓存</span>
                    </li>
                    <li className="flex items-start space-x-2 text-sm text-gray-600">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>返回首页重新开始</span>
                    </li>
                  </ul>
                </div>

                {/* 操作按钮 */}
                <div className="space-y-3">
                  <Button onClick={reset} className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重试
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/'} 
                    className="w-full"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    返回首页
                  </Button>
                </div>

                {/* 帮助信息 */}
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    如果问题持续存在，请联系技术支持
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </body>
    </html>
  );
}
