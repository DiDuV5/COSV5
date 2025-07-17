/**
 * @fileoverview 页面头部组件
 * @description 转码视频测试页面的头部导航和标题
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * 页面头部组件
 * @returns JSX元素
 */
export const PageHeader: React.FC = () => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/system-tests">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回测试中心
          </Link>
        </Button>
      </div>
      <h1 className="text-3xl font-bold text-gray-900">转码后视频测试</h1>
      <p className="text-gray-600 mt-2">测试转码后的视频播放效果和质量</p>
    </div>
  );
};
