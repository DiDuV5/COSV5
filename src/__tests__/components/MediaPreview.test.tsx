/**
 * @fileoverview MediaPreview组件测试
 * @description 测试修复后的MediaPreview组件是否正确使用MediaProxy
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MediaPreview, MediaFile } from '@/components/upload/MediaPreview';

// Mock MediaProxy组件
jest.mock('@/components/media/MediaProxy', () => ({
  MediaProxy: ({ path, alt, className }: { path: string; alt: string; className?: string }) => (
    <div data-testid="media-proxy" data-path={path} data-alt={alt} className={className}>
      MediaProxy: {path}
    </div>
  ),
}));

// Mock其他依赖
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick}>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/upload/MediaSortModal', () => ({
  MediaSortModal: () => <div>MediaSortModal</div>,
}));

describe('MediaPreview组件', () => {
  const mockFiles: MediaFile[] = [
    {
      id: '1',
      filename: 'test-image.jpg',
      originalName: 'test-image.jpg',
      url: 'https://example.com/uploads/test-image.jpg',
      thumbnailUrl: 'https://example.com/uploads/thumb/test-image.jpg',
      mediaType: 'IMAGE',
      width: 800,
      height: 600,
      fileSize: 1024000,
    },
    {
      id: '2',
      filename: 'test-video.mp4',
      originalName: 'test-video.mp4',
      url: 'https://example.com/uploads/test-video.mp4',
      thumbnailUrl: 'https://example.com/uploads/thumb/test-video.jpg',
      mediaType: 'VIDEO',
      width: 1920,
      height: 1080,
      duration: 120,
      fileSize: 5120000,
    },
  ];

  it('应该正确渲染图片文件并使用MediaProxy', () => {
    render(
      <MediaPreview
        files={[mockFiles[0]]}
        onDelete={jest.fn()}
        onReorder={jest.fn()}
        editable={true}
      />
    );

    // 检查是否使用了MediaProxy组件
    const mediaProxy = screen.getByTestId('media-proxy');
    expect(mediaProxy).toBeInTheDocument();

    // 检查路径是否正确提取
    expect(mediaProxy).toHaveAttribute('data-path', '/uploads/thumb/test-image.jpg');
    expect(mediaProxy).toHaveAttribute('data-alt', 'test-image.jpg');
  });

  it('应该正确渲染视频文件并使用MediaProxy', () => {
    render(
      <MediaPreview
        files={[mockFiles[1]]}
        onDelete={jest.fn()}
        onReorder={jest.fn()}
        editable={true}
      />
    );

    // 检查是否使用了MediaProxy组件
    const mediaProxy = screen.getByTestId('media-proxy');
    expect(mediaProxy).toBeInTheDocument();

    // 检查路径是否正确提取（视频应该使用缩略图）
    expect(mediaProxy).toHaveAttribute('data-path', '/uploads/thumb/test-video.jpg');
    expect(mediaProxy).toHaveAttribute('data-alt', 'test-video.mp4');
  });

  it('应该正确处理相对路径URL', () => {
    const fileWithRelativePath: MediaFile = {
      ...mockFiles[0],
      url: '/uploads/relative-image.jpg',
      thumbnailUrl: '/uploads/thumb/relative-image.jpg',
    };

    render(
      <MediaPreview
        files={[fileWithRelativePath]}
        onDelete={jest.fn()}
        onReorder={jest.fn()}
        editable={true}
      />
    );

    const mediaProxy = screen.getByTestId('media-proxy');
    expect(mediaProxy).toHaveAttribute('data-path', '/uploads/thumb/relative-image.jpg');
  });

  it('应该正确处理没有缩略图的情况', () => {
    const fileWithoutThumbnail: MediaFile = {
      ...mockFiles[0],
      thumbnailUrl: undefined,
    };

    render(
      <MediaPreview
        files={[fileWithoutThumbnail]}
        onDelete={jest.fn()}
        onReorder={jest.fn()}
        editable={true}
      />
    );

    const mediaProxy = screen.getByTestId('media-proxy');
    expect(mediaProxy).toHaveAttribute('data-path', '/uploads/test-image.jpg');
  });

  it('应该渲染多个文件', () => {
    render(
      <MediaPreview
        files={mockFiles}
        onDelete={jest.fn()}
        onReorder={jest.fn()}
        editable={true}
      />
    );

    const mediaProxies = screen.getAllByTestId('media-proxy');
    expect(mediaProxies).toHaveLength(2);
  });
});
