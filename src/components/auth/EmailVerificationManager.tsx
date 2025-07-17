/**
 * @fileoverview 邮箱验证管理组件
 * @description 提供邮箱验证状态查看和重新发送验证邮件功能
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/react-query: ^11.4.2
 * - lucide-react: ^0.263.1
 * - react: ^18.0.0
 *
 * @changelog
 * - 2025-06-29: 创建邮箱验证管理组件，迁移到tRPC
 */

'use client';

import { useState } from 'react';
import { CheckCircle, Mail, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/trpc/react';

interface EmailVerificationManagerProps {
  /** 用户邮箱地址 */
  email?: string;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 邮箱验证管理组件
 */
export function EmailVerificationManager({
  email,
  showDetails = true,
  className = '',
}: EmailVerificationManagerProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 获取验证状态
  const {
    data: verificationStatus,
    isPending: isLoadingStatus,
    refetch: refetchStatus,
  } = api.emailVerification.getVerificationStatus.useQuery(undefined, {
    refetchInterval: parseInt(process.env.COSEREEDEN_NEXT_PUBLIC_VERIFICATION_CHECK_INTERVAL || '30000'), // 可配置的刷新间隔
  });

  // 重新发送验证邮件
  const resendVerificationMutation = api.emailVerification.resendVerification.useMutation({
    onSuccess: (result) => {
      setIsResending(false);
      if (result.success) {
        setResendMessage({
          type: 'success',
          text: result.message,
        });
        // 刷新验证状态
        refetchStatus();
      } else {
        setResendMessage({
          type: 'error',
          text: result.message,
        });
      }
      // 5秒后清除消息
      setTimeout(() => setResendMessage(null), 5000);
    },
    onError: (error) => {
      setIsResending(false);
      setResendMessage({
        type: 'error',
        text: error.message || '发送失败，请稍后重试',
      });
      setTimeout(() => setResendMessage(null), 5000);
    },
  });

  const handleResendVerification = async () => {
    if (isResending) return;

    setIsResending(true);
    setResendMessage(null);

    try {
      await resendVerificationMutation.mutateAsync({ email: pendingEmail || '' });
    } catch (error: unknown) {
      // 错误已在onError中处理
    }
  };

  if (isLoadingStatus) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-600">检查验证状态...</span>
        </CardContent>
      </Card>
    );
  }

  if (!verificationStatus) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              无法获取邮箱验证状态，请刷新页面重试。
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { emailVerified, verifiedAt, pendingVerification, pendingEmail } = verificationStatus;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {emailVerified ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Mail className="h-5 w-5 text-orange-500" />
          )}
          邮箱验证状态
        </CardTitle>
        {showDetails && (
          <CardDescription>
            {emailVerified
              ? '您的邮箱已验证，可以正常使用所有功能'
              : '请验证您的邮箱地址以激活账户功能'}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 验证状态显示 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {emailVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
            <div>
              <p className="text-sm font-medium">
                {emailVerified ? '邮箱已验证' : '邮箱未验证'}
              </p>
              {emailVerified && verifiedAt && showDetails && (
                <p className="text-xs text-gray-500">
                  验证时间: {new Date(verifiedAt).toLocaleString('zh-CN')}
                </p>
              )}
              {!emailVerified && pendingVerification && (
                <p className="text-xs text-orange-600">
                  验证邮件已发送到: {pendingEmail}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 消息显示 */}
        {resendMessage && (
          <Alert className={resendMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription className={resendMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {resendMessage.text}
            </AlertDescription>
          </Alert>
        )}

        {/* 操作按钮 */}
        {!emailVerified && (
          <div className="space-y-3">
            <Button
              onClick={handleResendVerification}
              disabled={isResending}
              className="w-full"
              variant="outline"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新发送验证邮件
                </>
              )}
            </Button>

            {showDetails && (
              <div className="text-xs text-gray-500 space-y-1">
                <p>• 验证邮件可能需要几分钟才能到达</p>
                <p>• 请检查垃圾邮件文件夹</p>
                <p>• 验证链接有效期为24小时</p>
              </div>
            )}
          </div>
        )}

        {/* 已验证状态的额外信息 */}
        {emailVerified && showDetails && (
          <div className="text-xs text-gray-500 bg-green-50 p-3 rounded-lg">
            <p className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              您的邮箱已成功验证，现在可以：
            </p>
            <ul className="mt-2 ml-4 space-y-1">
              <li>• 接收重要通知和更新</li>
              <li>• 使用密码重置功能</li>
              <li>• 访问所有平台功能</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 简化版邮箱验证状态指示器
 */
export function EmailVerificationIndicator({ className = '' }: { className?: string }) {
  const { data: verificationStatus, isPending } = api.emailVerification.getVerificationStatus.useQuery();

  if (isPending) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">检查中...</span>
      </div>
    );
  }

  if (!verificationStatus) {
    return null;
  }

  const { emailVerified } = verificationStatus;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {emailVerified ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-700">邮箱已验证</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-orange-700">邮箱未验证</span>
        </>
      )}
    </div>
  );
}
