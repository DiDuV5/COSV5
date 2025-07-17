/**
 * @fileoverview PreviewSection组件测试
 * @description 验证媒体显示修复效果
 * @author Augment AI
 * @date 2025-07-08
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PreviewSection } from '@/app/create/components/PreviewSection';
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

// Mock Next.js Image组件
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className }: { src: string; alt: string; className: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} data-testid="next-image" />;
  },
}));

describe('PreviewSection媒体显示修复', () => {
  const mockCurrentUser = {
    id: 'user-1',
    name: 'Test User',
    avatar: '/avatar.jpg',
  };

  const mockImageFile: MediaFile = {
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
  };

  const mockVideoFile: MediaFile = {
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
    order: 0,
  };

  it('应该使用MediaProxy组件显示图片文件', () => {
    render(
      <PreviewSection
        title="测试标题"
        description="测试描述"
        content="测试内容"
        uploadedFiles={[mockImageFile]}
        extractedTags={['测试标签']}
        visibility="PUBLIC"
        currentUser={mockCurrentUser}
      />
    );

    // 验证MediaProxy组件被渲染
    const mediaProxy = screen.getByTestId('media-proxy');
    expect(mediaProxy).toBeInTheDocument();

    // 验证路径提取正确
    expect(mediaProxy).toHaveAttribute('data-path', '/uploads/2025/07/test-image.jpg');
    expect(mediaProxy).toHaveAttribute('data-alt', '预览图片');
  });

  it('应该使用MediaProxy组件显示视频缩略图', () => {
    render(
      <PreviewSection
        title="测试标题"
        description="测试描述"
        content="测试内容"
        uploadedFiles={[mockVideoFile]}
        extractedTags={['测试标签']}
        visibility="PUBLIC"
        currentUser={mockCurrentUser}
      />
    );

    // 验证MediaProxy组件被渲染（用于视频缩略图）
    const mediaProxy = screen.getByTestId('media-proxy');
    expect(mediaProxy).toBeInTheDocument();

    // 验证缩略图路径提取正确
    expect(mediaProxy).toHaveAttribute('data-path', '/uploads/2025/07/thumb-test-video.jpg');
    expect(mediaProxy).toHaveAttribute('data-alt', '视频缩略图');
  });

  it('应该正确处理相对路径URL', () => {
    const fileWithRelativePath: MediaFile = {
      ...mockImageFile,
      url: 'uploads/2025/07/relative-image.jpg',
      thumbnailUrl: undefined,
    };

    render(
      <PreviewSection
        title="测试标题"
        uploadedFiles={[fileWithRelativePath]}
        extractedTags={[]}
        visibility="PUBLIC"
        currentUser={mockCurrentUser}
      />
    );

    const mediaProxy = screen.getByTestId('media-proxy');
    expect(mediaProxy).toHaveAttribute('data-path', '/uploads/2025/07/relative-image.jpg');
  });

  it('应该正确处理空URL情况', () => {
    const fileWithEmptyUrl: MediaFile = {
      ...mockImageFile,
      url: '',
      thumbnailUrl: '',
    };

    render(
      <PreviewSection
        title="测试标题"
        uploadedFiles={[fileWithEmptyUrl]}
        extractedTags={[]}
        visibility="PUBLIC"
        currentUser={mockCurrentUser}
      />
    );

    const mediaProxy = screen.getByTestId('media-proxy');
    expect(mediaProxy).toHaveAttribute('data-path', '');
  });

  it('应该显示多文件计数', () => {
    const multipleFiles = [mockImageFile, mockVideoFile];

    render(
      <PreviewSection
        title="测试标题"
        uploadedFiles={multipleFiles}
        extractedTags={[]}
        visibility="PUBLIC"
        currentUser={mockCurrentUser}
      />
    );

    // 验证显示文件计数
    expect(screen.getByText('+1 个文件')).toBeInTheDocument();
  });
});
