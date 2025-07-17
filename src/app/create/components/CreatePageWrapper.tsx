/**
 * @fileoverview 创作页面包装组件
 * @description 处理useSearchParams()的Suspense边界，解决Next.js CSR bailout警告
 */

'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

interface CreatePageWrapperProps {
  children: React.ReactNode;
}

/**
 * 加载状态组件
 */
function CreatePageLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">正在加载创作页面...</p>
      </div>
    </div>
  );
}

/**
 * 创作页面包装组件
 * 使用Suspense边界包装使用useSearchParams()的组件
 */
export function CreatePageWrapper({ children }: CreatePageWrapperProps) {
  return (
    <Suspense fallback={<CreatePageLoading />}>
      {children}
    </Suspense>
  );
}
