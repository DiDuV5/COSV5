/**
 * @fileoverview 权限守卫组件测试
 * @description 测试统一权限验证组件的功能和用户体验
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionGuard, ConditionalPermission } from '@/components/auth/PermissionGuard';
import { usePermissionCheck } from '@/hooks/use-permission-check';

// 类型断言辅助函数
const expectElement = (element: any) => expect(element) as any;

// Mock dependencies
jest.mock('@/hooks/use-permission-check');
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSession: () => ({
    data: null,
    status: 'loading',
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockUsePermissionCheck = usePermissionCheck as jest.Mock;

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
      <SessionProvider session={null}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
}

describe('PermissionGuard 组件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('加载状态', () => {
    it('应该显示加载状态', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: false,
        isLoading: true,
      });

      // Act
      render(
        <TestWrapper>
          <PermissionGuard requiredLevel="CREATOR">
            <div>受保护的内容</div>
          </PermissionGuard>
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('正在验证权限...')) as any).toBeInTheDocument();
      (expect(screen.queryByText('受保护的内容')).not as any).toBeInTheDocument();
    });

    it('应该支持自定义加载组件', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: false,
        isLoading: true,
      });

      const CustomLoading = () => <div>自定义加载中...</div>;

      // Act
      render(
        <TestWrapper>
          <PermissionGuard
            requiredLevel="CREATOR"
            loadingComponent={<CustomLoading />}
          >
            <div>受保护的内容</div>
          </PermissionGuard>
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('自定义加载中...')) as any).toBeInTheDocument();
    });
  });

  describe('权限验证成功', () => {
    it('应该渲染子组件当权限验证通过', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: true,
        isLoading: false,
        user: {
          id: 'user-1',
          userLevel: 'CREATOR',
        },
      });

      // Act
      render(
        <TestWrapper>
          <PermissionGuard requiredLevel="CREATOR">
            <div>受保护的内容</div>
          </PermissionGuard>
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('受保护的内容')) as any).toBeInTheDocument();
    });
  });

  describe('权限验证失败', () => {
    it('应该显示未登录提示', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: false,
        isLoading: false,
        error: '请先登录',
      });

      // Act
      render(
        <TestWrapper>
          <PermissionGuard requiredLevel="CREATOR">
            <div>受保护的内容</div>
          </PermissionGuard>
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('请先登录')) as any).toBeInTheDocument();
      (expect(screen.getByText('您需要登录后才能访问此功能。')) as any).toBeInTheDocument();
      (expect(screen.getByText('立即登录')) as any).toBeInTheDocument();
      (expect(screen.queryByText('受保护的内容')).not as any).toBeInTheDocument();
    });

    it('应该显示权限不足提示', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: false,
        isLoading: false,
        error: '需要CREATOR级别权限',
        user: {
          id: 'user-1',
          userLevel: 'USER',
        },
        details: '当前等级: USER, 需要等级: CREATOR',
      });

      // Act
      render(
        <TestWrapper>
          <PermissionGuard
            requiredLevel="CREATOR"
            showDetails={true}
          >
            <div>受保护的内容</div>
          </PermissionGuard>
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('权限不足')) as any).toBeInTheDocument();
      (expect(screen.getByText('需要CREATOR级别权限')) as any).toBeInTheDocument();
      (expect(screen.getByText('当前等级: 入馆')) as any).toBeInTheDocument();
      (expect(screen.getByText('需要等级: 荣誉')) as any).toBeInTheDocument();
      (expect(screen.getByText('当前等级: USER, 需要等级: CREATOR')) as any).toBeInTheDocument();
    });

    it('应该显示需要验证提示', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: false,
        isLoading: false,
        error: '请先验证邮箱',
        user: {
          id: 'user-1',
          userLevel: 'CREATOR',
          isVerified: false,
        },
      });

      // Act
      render(
        <TestWrapper>
          <PermissionGuard
            requiredLevel="CREATOR"
            requireVerified={true}
          >
            <div>受保护的内容</div>
          </PermissionGuard>
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('需要验证')) as any).toBeInTheDocument();
      (expect(screen.getByText('请先验证邮箱')) as any).toBeInTheDocument();
    });

    it('应该支持自定义权限不足组件', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: false,
        isLoading: false,
        error: '权限不足',
      });

      const CustomFallback = () => <div>自定义权限不足提示</div>;

      // Act
      render(
        <TestWrapper>
          <PermissionGuard
            requiredLevel="CREATOR"
            fallbackComponent={<CustomFallback />}
          >
            <div>受保护的内容</div>
          </PermissionGuard>
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('自定义权限不足提示')) as any).toBeInTheDocument();
    });
  });

  describe('ConditionalPermission 组件测试', () => {
    it('应该在有权限时显示内容', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: true,
        isLoading: false,
      });

      // Act
      render(
        <TestWrapper>
          <ConditionalPermission requiredLevel="CREATOR">
            <div>有权限的内容</div>
          </ConditionalPermission>
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('有权限的内容')) as any).toBeInTheDocument();
    });

    it('应该在无权限时显示fallback内容', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: false,
        isLoading: false,
      });

      // Act
      render(
        <TestWrapper>
          <ConditionalPermission
            requiredLevel="CREATOR"
            fallback={<div>无权限时的内容</div>}
          >
            <div>有权限的内容</div>
          </ConditionalPermission>
        </TestWrapper>
      );

      // Assert
      (expect(screen.getByText('无权限时的内容')) as any).toBeInTheDocument();
      (expect(screen.queryByText('有权限的内容')).not as any).toBeInTheDocument();
    });

    it('应该在加载时不显示任何内容', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: false,
        isLoading: true,
      });

      // Act
      render(
        <TestWrapper>
          <ConditionalPermission requiredLevel="CREATOR">
            <div>有权限的内容</div>
          </ConditionalPermission>
        </TestWrapper>
      );

      // Assert
      (expect(screen.queryByText('有权限的内容')).not as any).toBeInTheDocument();
    });
  });

  describe('权限选项测试', () => {
    it('应该传递正确的权限选项', () => {
      // Arrange
      const permissionOptions = {
        requiredLevel: 'ADMIN' as const,
        requireVerified: true,
        requireActive: true,
        requirePublishPermission: true,
      };

      mockUsePermissionCheck.mockReturnValue({
        hasPermission: true,
        isLoading: false,
      });

      // Act
      render(
        <TestWrapper>
          <PermissionGuard {...permissionOptions}>
            <div>受保护的内容</div>
          </PermissionGuard>
        </TestWrapper>
      );

      // Assert
      expect(mockUsePermissionCheck).toHaveBeenCalledWith(permissionOptions);
    });

    it('应该支持操作描述', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: true,
        isLoading: false,
      });

      // Act
      render(
        <TestWrapper>
          <PermissionGuard
            requiredLevel="CREATOR"
            operation="发布作品"
          >
            <div>受保护的内容</div>
          </PermissionGuard>
        </TestWrapper>
      );

      // Assert
      expect(mockUsePermissionCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: '发布作品',
        })
      );
    });
  });

  describe('样式和类名', () => {
    it('应该应用自定义类名', () => {
      // Arrange
      mockUsePermissionCheck.mockReturnValue({
        hasPermission: false,
        isLoading: true,
      });

      // Act
      const { container } = render(
        <TestWrapper>
          <PermissionGuard
            requiredLevel="CREATOR"
            className="custom-permission-guard"
          >
            <div>受保护的内容</div>
          </PermissionGuard>
        </TestWrapper>
      );

      // Assert
      (expect(container.firstChild) as any).toHaveClass('custom-permission-guard');
    });
  });
});
