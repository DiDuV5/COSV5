/**
 * @fileoverview /create页面媒体显示集成测试
 * @description 验证媒体显示修复的完整流程
 * @author Augment AI
 * @date 2025-07-08
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PreviewSection } from '@/app/create/components/PreviewSection';
import { MediaWorkbench } from '@/app/create/components/MediaWorkbench';
import type { MediaFile } from '@/components/upload/MediaPreview';
import { generateTestMediaUrl, generateTestThumbnailUrl } from '../helpers/test-constants';

// Mock MediaProxy组件
jest.mock('@/components/media/MediaProxy', () => ({
  MediaProxy: ({ path, alt, className }: { path: string; alt: string; className: string }) => (
    <div data-testid="media-proxy" data-path={path} data-alt={alt} className={className}>
      MediaProxy: {path}
    </div>
  ),
}));

// Mock MediaPreview组件
jest.mock('@/components/upload/MediaPreview', () => ({
  MediaPreview: ({ files }: { files: MediaFile[] }) => (
    <div data-testid="media-preview">
      {files.map((file) => (
        <div key={file.id} data-testid="media-proxy" data-path={file.url}>
          MediaProxy: {file.url}
        </div>
      ))}
    </div>
  ),
}));

// Mock Next.js Image组件
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className }: { src: string; alt: string; className: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} data-testid="next-image" />;
  },
}));

describe('/create页面媒体显示集成测试', () => {
  const mockCurrentUser = {
    id: 'user-1',
    name: 'Test User',
    avatar: '/avatar.jpg',
  };

  const mockMediaFiles: MediaFile[] = [
    {
      id: 'img-1',
      filename: 'test-image.jpg',
      originalName: 'test-image.jpg',
      url: generateTestMediaUrl('test-image.jpg'),
      thumbnailUrl: generateTestThumbnailUrl('test-image.jpg'),
      mediaType: 'IMAGE',
      width: 1920,
      height: 1080,
      fileSize: 1024000,
      order: 0,
    },
    {
      id: 'vid-1',
      filename: 'test-video.mp4',
      originalName: 'test-video.mp4',
      url: generateTestMediaUrl('test-video.mp4', 'video'),
      thumbnailUrl: generateTestThumbnailUrl('test-video.jpg'),
      mediaType: 'VIDEO',
      width: 1920,
      height: 1080,
      duration: 120,
      fileSize: 5024000,
      order: 1,
    },
  ];

  describe('PreviewSection媒体显示', () => {
    it('应该使用MediaProxy组件而不是直接的Image组件', () => {
      render(
        <PreviewSection
          title="测试标题"
          description="测试描述"
          content="测试内容"
          uploadedFiles={mockMediaFiles}
          extractedTags={['测试标签']}
          visibility="PUBLIC"
          currentUser={mockCurrentUser}
        />
      );

      // 验证使用了MediaProxy组件
      const mediaProxies = screen.getAllByTestId('media-proxy');
      expect(mediaProxies.length).toBeGreaterThan(0);

      // 验证没有直接使用Next.js Image组件
      const nextImages = screen.queryAllByTestId('next-image');
      expect(nextImages).toHaveLength(0);

      // 验证路径提取正确
      const firstMediaProxy = mediaProxies[0];
      expect(firstMediaProxy).toHaveAttribute('data-path', '/uploads/2025/07/test-image.jpg');
    });

    it('应该正确处理视频文件的缩略图显示', () => {
      const videoOnlyFiles = [mockMediaFiles[1]]; // 只有视频文件

      render(
        <PreviewSection
          title="测试标题"
          uploadedFiles={videoOnlyFiles}
          extractedTags={[]}
          visibility="PUBLIC"
          currentUser={mockCurrentUser}
        />
      );

      const mediaProxy = screen.getByTestId('media-proxy');
      expect(mediaProxy).toHaveAttribute('data-path', '/uploads/2025/07/thumb-test-video.jpg');
      expect(mediaProxy).toHaveAttribute('data-alt', '视频缩略图');
    });
  });

  describe('MediaWorkbench媒体显示', () => {
    it('应该使用MediaPreview组件正确显示媒体文件', () => {
      render(
        <MediaWorkbench
          uploadedFiles={mockMediaFiles}
          showMediaPreview={true}
          onShowUploadModal={() => {}}
          onToggleMediaPreview={() => {}}
          onFileDelete={() => {}}
          onFileReorder={() => {}}
        />
      );

      // 验证MediaPreview组件被渲染
      const mediaPreview = screen.getByTestId('media-preview');
      expect(mediaPreview).toBeInTheDocument();

      // 验证所有媒体文件都被正确显示
      const mediaProxies = screen.getAllByTestId('media-proxy');
      expect(mediaProxies).toHaveLength(2);
    });
  });

  describe('媒体显示一致性验证', () => {
    it('PreviewSection和MediaWorkbench应该使用相同的媒体代理机制', () => {
      const { rerender } = render(
        <PreviewSection
          title="测试标题"
          uploadedFiles={mockMediaFiles}
          extractedTags={[]}
          visibility="PUBLIC"
          currentUser={mockCurrentUser}
        />
      );

      // 获取PreviewSection中的MediaProxy
      const previewMediaProxies = screen.getAllByTestId('media-proxy');
      const previewPaths = previewMediaProxies.map(el => el.getAttribute('data-path'));

      // 重新渲染为MediaWorkbench
      rerender(
        <MediaWorkbench
          uploadedFiles={mockMediaFiles}
          showMediaPreview={true}
          onShowUploadModal={() => {}}
          onToggleMediaPreview={() => {}}
          onFileDelete={() => {}}
          onFileReorder={() => {}}
        />
      );

      // 获取MediaWorkbench中的MediaProxy
      const workbenchMediaProxies = screen.getAllByTestId('media-proxy');
      const workbenchPaths = workbenchMediaProxies.map(el => el.getAttribute('data-path'));

      // 验证两者使用相同的路径处理机制
      expect(previewPaths).toEqual(expect.arrayContaining([
        '/uploads/2025/07/test-image.jpg',
        '/uploads/2025/07/thumb-test-video.jpg'
      ]));

      expect(workbenchPaths).toEqual(expect.arrayContaining([
        generateTestMediaUrl('test-image.jpg'),
        generateTestMediaUrl('test-video.mp4', 'video')
      ]));
    });

    it('应该正确处理各种URL格式', () => {
      const mixedUrlFiles: MediaFile[] = [
        {
          ...mockMediaFiles[0],
          url: 'uploads/2025/07/relative-path.jpg', // 相对路径
        },
        {
          ...mockMediaFiles[1],
          url: '/uploads/2025/07/absolute-path.mp4', // 绝对路径
        },
      ];

      render(
        <PreviewSection
          title="测试标题"
          uploadedFiles={mixedUrlFiles}
          extractedTags={[]}
          visibility="PUBLIC"
          currentUser={mockCurrentUser}
        />
      );

      const mediaProxies = screen.getAllByTestId('media-proxy');
      const paths = mediaProxies.map(el => el.getAttribute('data-path'));

      // 验证路径标准化
      expect(paths).toContain('/uploads/2025/07/relative-path.jpg');
      expect(paths).toContain('/uploads/2025/07/absolute-path.mp4');
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该正确处理空媒体文件列表', () => {
      render(
        <PreviewSection
          title="测试标题"
          uploadedFiles={[]}
          extractedTags={[]}
          visibility="PUBLIC"
          currentUser={mockCurrentUser}
        />
      );

      // 验证没有媒体预览显示
      const mediaProxies = screen.queryAllByTestId('media-proxy');
      expect(mediaProxies).toHaveLength(0);
    });

    it('应该正确处理无效URL的媒体文件', () => {
      const invalidUrlFile: MediaFile = {
        ...mockMediaFiles[0],
        url: '',
        thumbnailUrl: '',
      };

      render(
        <PreviewSection
          title="测试标题"
          uploadedFiles={[invalidUrlFile]}
          extractedTags={[]}
          visibility="PUBLIC"
          currentUser={mockCurrentUser}
        />
      );

      const mediaProxy = screen.getByTestId('media-proxy');
      expect(mediaProxy).toHaveAttribute('data-path', '');
    });
  });
});
