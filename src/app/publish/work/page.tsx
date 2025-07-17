/**
 * @fileoverview 发布作品页面重定向
 * @description 重定向到新的作品发布路径
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @changelog
 * - 2024-01-XX: 创建重定向页面，从 /create 迁移到 /publish/work
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PublishWorkRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到原来的路径，保持功能不变
    router.replace('/create');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">路径优化中</h1>
          <p className="text-gray-600 mb-4">
            正在跳转到 <strong>发布作品</strong> 页面
          </p>
          <p className="text-sm text-gray-500 mb-6">
            新路径: <code className="bg-gray-100 px-2 py-1 rounded">/publish/work</code>
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-sm text-gray-500">正在跳转...</p>
        </div>
        
        <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-lg text-left">
          <h3 className="font-medium text-purple-900 mb-2">路径说明</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• <code>/publish/work</code> - 发布作品（正式内容）</li>
            <li>• <code>/publish/moment</code> - 发布动态（日常分享）</li>
            <li>• 更清晰的功能区分</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
