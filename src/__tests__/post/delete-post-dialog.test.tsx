/**
 * @fileoverview 删除作品对话框测试
 * @description 测试删除确认对话框的功能和用户交互
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeletePostDialog } from '@/components/post/DeletePostDialog';
import { api } from '@/trpc/react';

// 扩展Jest匹配器类型
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeDisabled(): R;
    }
  }
}

// Mock dependencies
jest.mock('@/trpc/react', () => ({
  api: {
    post: {
      deleteMyPost: {
        useMutation: jest.fn(),
      },
      delete: {
        useMutation: jest.fn(),
      },
    },
  },
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('DeletePostDialog 组件测试', () => {
  const mockPost = {
    id: 'post-1',
    title: '测试作品',
    contentType: 'POST' as const,
    authorId: 'user-1',
    mediaCount: 2,
    commentCount: 5,
    likeCount: 10,
    publishedAt: new Date(),
  };

  const mockOnSuccess = jest.fn();
  const mockOnOpenChange = jest.fn();

  let mockDeleteMutation: any;
  let mockAdminDeleteMutation: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDeleteMutation = {
      mutateAsync: jest.fn(),
      isLoading: false,
    };

    mockAdminDeleteMutation = {
      mutateAsync: jest.fn(),
      isLoading: false,
    };

    (api.post.deleteMyPost.useMutation as jest.Mock).mockReturnValue(mockDeleteMutation);
    (api.post.delete.useMutation as jest.Mock).mockReturnValue(mockAdminDeleteMutation);
  });

  describe('对话框显示', () => {
    it('应该在关闭状态时不显示内容', () => {
      // Act
      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={false}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Assert
      (expect(screen.queryByText('删除作品确认')).not as any).toBeInTheDocument();
    });

    it('应该在打开状态时显示对话框', () => {
      // Act
      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('删除作品确认')) as any).toBeInTheDocument();
      (expect(screen.getByText('测试作品')) as any).toBeInTheDocument();
      (expect(screen.getByText('2 个媒体文件')) as any).toBeInTheDocument();
      (expect(screen.getByText('5 条评论')) as any).toBeInTheDocument();
      (expect(screen.getByText('10 个点赞')) as any).toBeInTheDocument();
    });

    it('应该显示动态类型的正确标题', () => {
      // Arrange
      const momentPost = { ...mockPost, contentType: 'MOMENT' as const };

      // Act
      render(
        <TestWrapper>
          <DeletePostDialog
            post={momentPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('删除动态确认')) as any).toBeInTheDocument();
    });

    it('应该显示警告信息', () => {
      // Act
      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('删除此作品将会：')) as any).toBeInTheDocument();
      (expect(screen.getByText('永久删除作品内容和描述')) as any).toBeInTheDocument();
      (expect(screen.getByText('删除 2 个关联的媒体文件')) as any).toBeInTheDocument();
      (expect(screen.getByText('删除 5 条评论')) as any).toBeInTheDocument();
      (expect(screen.getByText('删除 10 个点赞记录')) as any).toBeInTheDocument();
      (expect(screen.getByText('此操作无法撤销，请谨慎操作！')) as any).toBeInTheDocument();
    });
  });

  describe('表单验证', () => {
    it('应该验证标题确认输入', async () => {
      // Arrange
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Act
      const titleInput = screen.getByPlaceholderText('输入 测试作品 确认删除');
      const reasonInput = screen.getByPlaceholderText('请说明删除此作品的原因...');
      const confirmCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByText('确认删除');

      await user.type(titleInput, '错误的标题');
      await user.type(reasonInput, '测试删除原因');
      await user.click(confirmCheckbox);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        (expect(screen.getByText('输入的标题与作品标题不匹配')) as any).toBeInTheDocument();
      });
    });

    it('应该验证删除原因必填', async () => {
      // Arrange
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Act
      const titleInput = screen.getByPlaceholderText('输入 测试作品 确认删除');
      const reasonInput = screen.getByPlaceholderText('请说明删除此作品的原因...');
      const confirmCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByText('确认删除');

      await user.type(titleInput, '测试作品');
      await user.type(reasonInput, '短'); // 少于5个字符
      await user.click(confirmCheckbox);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        (expect(screen.getByText('请说明删除原因（至少5个字符）')) as any).toBeInTheDocument();
      });
    });

    it('应该验证确认理解复选框', async () => {
      // Arrange
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Act
      const titleInput = screen.getByPlaceholderText('输入 测试作品 确认删除');
      const reasonInput = screen.getByPlaceholderText('请说明删除此作品的原因...');
      const submitButton = screen.getByText('确认删除');

      await user.type(titleInput, '测试作品');
      await user.type(reasonInput, '测试删除原因');
      // 不勾选确认复选框
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        (expect(screen.getByText('请确认您理解删除的后果')) as any).toBeInTheDocument();
      });
    });
  });

  describe('删除操作', () => {
    it('应该成功删除作品', async () => {
      // Arrange
      const user = userEvent.setup();
      mockDeleteMutation.mutateAsync.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Act
      const titleInput = screen.getByPlaceholderText('输入 测试作品 确认删除');
      const reasonInput = screen.getByPlaceholderText('请说明删除此作品的原因...');
      const confirmCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByText('确认删除');

      await user.type(titleInput, '测试作品');
      await user.type(reasonInput, '测试删除原因');
      await user.click(confirmCheckbox);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledWith({
          id: 'post-1',
          reason: '测试删除原因',
        });
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('应该处理删除失败', async () => {
      // Arrange
      const user = userEvent.setup();
      const errorMessage = '删除失败：权限不足';
      mockDeleteMutation.mutateAsync.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Act
      const titleInput = screen.getByPlaceholderText('输入 测试作品 确认删除');
      const reasonInput = screen.getByPlaceholderText('请说明删除此作品的原因...');
      const confirmCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByText('确认删除');

      await user.type(titleInput, '测试作品');
      await user.type(reasonInput, '测试删除原因');
      await user.click(confirmCheckbox);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        (expect(screen.getByText(errorMessage)) as any).toBeInTheDocument();
      });
    });

    it('应该支持管理员删除', async () => {
      // Arrange
      const user = userEvent.setup();
      mockAdminDeleteMutation.mutateAsync.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
            isAdminDelete={true}
          />
        </TestWrapper>
      );

      // Act
      const titleInput = screen.getByPlaceholderText('输入 测试作品 确认删除');
      const reasonInput = screen.getByPlaceholderText('请说明删除此作品的原因...');
      const confirmCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByText('确认删除');

      await user.type(titleInput, '测试作品');
      await user.type(reasonInput, '管理员删除原因');
      await user.click(confirmCheckbox);
      await user.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(mockAdminDeleteMutation.mutateAsync).toHaveBeenCalledWith({
          id: 'post-1',
          reason: '管理员删除原因',
        });
      });
    });
  });

  describe('用户交互', () => {
    it('应该支持取消操作', async () => {
      // Arrange
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Act
      const cancelButton = screen.getByText('取消');
      await user.click(cancelButton);

      // Assert
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('应该在删除过程中禁用按钮', () => {
      // Arrange
      mockDeleteMutation.isLoading = true;

      render(
        <TestWrapper>
          <DeletePostDialog
            post={mockPost}
            open={true}
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      );

      // Assert
      const submitButton = screen.getByText('删除中...');
      const cancelButton = screen.getByText('取消');

      (expect(submitButton) as any).toBeDisabled();
      (expect(cancelButton) as any).toBeDisabled();
    });
  });
});
