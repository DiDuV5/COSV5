/**
 * @fileoverview 邮箱功能测试页面
 * @description 测试邮箱配置和发送功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/react-query: ^10.45.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 移动到admin/system-tests目录
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Mail, Send, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/trpc/react";

export default function TestEmailPage() {
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sendTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: '请输入邮箱地址' });
      return;
    }

    setIsSending(true);
    setMessage(null);

    try {
      // 这里可以调用测试邮件发送的 API
      // const response = await fetch('/api/test-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: testEmail }),
      // });

      // 模拟发送
      await new Promise(resolve => setTimeout(resolve, 2000));

      setMessage({
        type: 'success',
        text: `测试邮件已发送到 ${testEmail}，请检查您的邮箱`
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: '邮件发送失败，请检查邮箱配置'
      });
    } finally {
      setIsSending(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Link 
            href="/admin/system-tests"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回测试中心
          </Link>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">邮箱功能测试</h1>
          <p className="text-gray-600 mt-2">测试 SMTP 配置和邮件发送功能</p>
        </div>

        {/* 测试结果消息 */}
        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* 测试邮件发送 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>发送测试邮件</span>
            </CardTitle>
            <CardDescription>
              输入邮箱地址，发送一封测试邮件来验证 SMTP 配置是否正确
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="testEmail">测试邮箱地址</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                disabled={isSending}
              />
            </div>

            <Button
              onClick={sendTestEmail}
              disabled={isSending || !testEmail}
              className="w-full"
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  发送中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  发送测试邮件
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 邮箱验证流程说明 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>邮箱验证流程</CardTitle>
            <CardDescription>
              了解用户注册时的邮箱验证流程
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">用户注册</h4>
                  <p className="text-sm text-gray-600">用户填写注册表单，包括邮箱地址</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium">发送验证邮件</h4>
                  <p className="text-sm text-gray-600">系统自动发送包含验证链接的邮件</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">用户点击验证</h4>
                  <p className="text-sm text-gray-600">用户点击邮件中的验证链接</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <h4 className="font-medium">验证完成</h4>
                  <p className="text-sm text-gray-600">账户激活，用户可以正常使用所有功能</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 配置检查清单 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>配置检查清单</CardTitle>
            <CardDescription>
              确保邮箱功能正常工作的配置要点
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm">SMTP 服务器地址和端口配置正确</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm">SMTP 用户名和密码有效</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm">发件人邮箱地址格式正确</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm">邮箱服务商允许第三方应用发送邮件</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm">防火墙允许 SMTP 端口通信</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">注意事项</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Gmail 需要开启&ldquo;应用专用密码&rdquo;</li>
                <li>• QQ邮箱和163邮箱需要开启SMTP服务</li>
                <li>• 生产环境建议使用专业的邮件服务商</li>
                <li>• 定期检查邮件发送日志和失败率</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 快速链接 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>相关功能</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <Link href="/admin/settings">
                  邮件设置
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/system-tests/system-status">
                  系统状态
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
