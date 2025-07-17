/**
 * @fileoverview 客户端提供者组件
 * @description 包装所有需要在客户端运行的提供者组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next-auth: ^4.24.0
 * - @trpc/react-query: ^10.45.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "@/components/ui/toaster";
import { StorageServiceProvider } from "@/components/providers/storage-service-provider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <TRPCReactProvider>
      <SessionProvider>
        <StorageServiceProvider>
          {children}
          <Toaster />
        </StorageServiceProvider>
      </SessionProvider>
    </TRPCReactProvider>
  );
}
