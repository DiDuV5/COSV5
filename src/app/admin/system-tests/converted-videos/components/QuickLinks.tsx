/**
 * @fileoverview 快速链接组件
 * @description 提供到其他测试页面的快速导航链接
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 */

import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * 链接项接口
 */
interface LinkItem {
  href: string;
  label: string;
}

/**
 * 快速链接数据
 */
const quickLinks: LinkItem[] = [
  {
    href: '/admin/system-tests/video-transcoding',
    label: '视频转码测试'
  },
  {
    href: '/admin/system-tests/firefox-video',
    label: 'Firefox视频测试'
  },
  {
    href: '/admin/system-tests/upload',
    label: '上传测试'
  }
];

/**
 * 快速链接组件
 * @returns JSX元素
 */
export const QuickLinks: React.FC = () => {
  return (
    <div className="mt-8 flex gap-4">
      {quickLinks.map((link) => (
        <Button key={link.href} variant="outline" asChild>
          <Link href={link.href}>
            {link.label}
          </Link>
        </Button>
      ))}
    </div>
  );
};
