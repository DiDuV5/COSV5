/**
 * @fileoverview 邮箱验证设置页面
 * @description 用户邮箱验证管理页面，使用tRPC API
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - react: ^18.0.0
 * - @trpc/react-query: ^11.4.2
 *
 * @changelog
 * - 2025-06-29: 创建邮箱验证设置页面，迁移到tRPC
 */

'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Mail, Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EmailVerificationManager } from '@/components/auth/EmailVerificationManager';

/**
 * 邮箱验证设置页面
 */
export default function EmailVerificationSettingsPage() {
  const { data: session, status } = useSession();

  // 如果未登录，重定向到登录页面
  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 页面头部 */}
        <div className="space-y-4">
          {/* 返回按钮 */}
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              返回设置
            </Button>
          </Link>

          {/* 页面标题 */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">邮箱验证</h1>
                <p className="text-gray-600">管理您的邮箱验证状态</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* 当前邮箱信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              当前邮箱
            </CardTitle>
            <CardDescription>
              您当前注册的邮箱地址
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{session?.user?.email || '未设置邮箱'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 邮箱验证管理 */}
        <EmailVerificationManager
          email={session?.user?.email || undefined}
          showDetails={true}
        />

        {/* 帮助信息 */}
        <Card>
          <CardHeader>
            <CardTitle>为什么需要验证邮箱？</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-gray-900">账户安全</h4>
                  <p className="text-sm text-gray-600">
                    验证邮箱可以确保账户安全，防止他人恶意注册
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-gray-900">密码重置</h4>
                  <p className="text-sm text-gray-600">
                    忘记密码时，可以通过验证邮箱重置密码
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-gray-900">重要通知</h4>
                  <p className="text-sm text-gray-600">
                    接收账户相关的重要通知和平台更新
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-gray-900">完整功能</h4>
                  <p className="text-sm text-gray-600">
                    访问平台的所有功能，包括发布作品、评论互动等
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 常见问题 */}
        <Card>
          <CardHeader>
            <CardTitle>常见问题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">没有收到验证邮件？</h4>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li>• 检查垃圾邮件文件夹</li>
                  <li>• 确认邮箱地址是否正确</li>
                  <li>• 等待几分钟后重试</li>
                  <li>• 点击{'"重新发送验证邮件"'}按钮</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">验证链接过期了？</h4>
                <p className="text-sm text-gray-600">
                  验证链接有效期为24小时。如果过期，请重新发送验证邮件获取新的链接。
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">想要更换邮箱？</h4>
                <p className="text-sm text-gray-600">
                  请联系客服协助更换邮箱地址。更换后需要重新验证新的邮箱。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 联系支持 */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                遇到问题？我们随时为您提供帮助
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/help/email-verification">
                  <Button variant="outline" size="sm">
                    查看帮助文档
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="sm">
                    联系客服
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
