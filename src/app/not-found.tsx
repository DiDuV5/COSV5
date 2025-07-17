/**
 * @fileoverview 404 Not Found 页面
 * @description 自定义404错误页面，避免Html组件导入错误
 * @author Augment AI
 * @date 2025-07-17
 * @version 1.0.0
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mb-4">
              <div className="text-6xl font-bold text-blue-500 mb-2">404</div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              页面未找到
            </CardTitle>
            <CardDescription className="text-gray-600">
              抱歉，您访问的页面不存在或已被移动
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 建议操作 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">您可以尝试:</h3>
              <ul className="space-y-2">
                <li className="flex items-start space-x-2 text-sm text-gray-600">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>检查网址是否输入正确</span>
                </li>
                <li className="flex items-start space-x-2 text-sm text-gray-600">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>返回首页重新导航</span>
                </li>
                <li className="flex items-start space-x-2 text-sm text-gray-600">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>使用搜索功能查找内容</span>
                </li>
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  返回首页
                </Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link href="/search">
                  <Search className="h-4 w-4 mr-2" />
                  搜索内容
                </Link>
              </Button>

              <Button variant="ghost" onClick={() => window.history.back()} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回上一页
              </Button>
            </div>

            {/* 帮助信息 */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                如果您认为这是一个错误，请{" "}
                <Link href="/contact" className="text-blue-600 hover:text-blue-500">
                  联系我们
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
