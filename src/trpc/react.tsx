/**
 * @fileoverview tRPC React 客户端配置
 * @description 配置 tRPC React Query 客户端
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @trpc/client: ^11.4.2
 * - @trpc/react-query: ^11.4.2
 * - @tanstack/react-query: ^5.81.2
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { loggerLink, unstable_httpBatchStreamLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import superjson from 'superjson';

import { type AppRouter } from '@/server/api/root';

// 定义错误类型接口
interface TRPCError {
  data?: {
    httpStatus?: number;
  };
}

// 扩展Window接口以包含上传客户端
declare global {
  interface Window {
    __UPLOAD_TRPC_CLIENT__?: ReturnType<typeof createUploadClient>;
  }
}

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // 使用 staleTime 避免立即重新获取
        staleTime: 30 * 1000, // 30 秒
        // 减少重试次数
        retry: (failureCount, error) => {
          // 不重试 4xx 错误
          const trpcError = error as TRPCError;
          if (trpcError?.data?.httpStatus && trpcError.data.httpStatus >= 400 && trpcError.data.httpStatus < 500) {
            return false;
          }
          // 最多重试 3 次
          return failureCount < 3;
        },
      },
      mutations: {
        // 上传操作允许重试网络错误
        retry: (failureCount, error) => {
          // 检查是否是网络错误
          const isNetworkError =
            error?.message?.includes('Failed to fetch') ||
            error?.message?.includes('network error') ||
            error?.message?.includes('ERR_NETWORK_CHANGED') ||
            error?.message?.includes('timeout');

          // 网络错误最多重试2次
          if (isNetworkError && failureCount < 2) {
            return true;
          }

          // 其他错误不重试
          return false;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // 指数退避，最大5秒
      },
    },
  });

let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // 服务器端：总是创建新的查询客户端
    return createQueryClient();
  } else {
    // 浏览器端：使用单例模式
    return (clientQueryClientSingleton ??= createQueryClient());
  }
};

export const api = createTRPCReact<AppRouter>();

/**
 * 创建上传专用的tRPC客户端
 * 使用专用域名解决HTTP/2协议问题
 */
function createUploadClient() {
  return api.createClient({
    links: [
      loggerLink({
        enabled: op =>
          process.env.NODE_ENV === 'development' ||
          (op.direction === 'down' && op.result instanceof Error),
      }),
      unstable_httpBatchStreamLink({
        url: getUploadBaseUrl() + '/api/trpc',
        transformer: superjson,
        headers() {
          const headers = new Map<string, string>();
          headers.set('x-trpc-source', 'react-upload');
          return Object.fromEntries(headers);
        },
        fetch(url, options) {
          const controller = new AbortController();
          const timeout = 300000; // 5分钟超时，适合大文件上传
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const fetchPromise = fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              ...options?.headers,
              'Content-Type': (options?.headers as Record<string, string>)?.['Content-Type'] || 'application/json',
            },
          }).catch((error) => {
            if (error.name === 'AbortError') {
              console.error('🚫 上传请求被中止:', url);
              throw new Error(`上传请求超时 (${timeout/1000}秒)`);
            }
            console.error('🌐 上传网络请求失败:', url, error);
            throw error;
          });

          fetchPromise.finally(() => clearTimeout(timeoutId));
          return fetchPromise;
        },
      }),
    ],
  });
}

/**
 * 创建增强的fetch函数，支持超时和错误处理
 */
function createEnhancedFetch() {
  return (url: RequestInfo | URL, options?: RequestInit) => {
    // 为上传操作增加超时时间
    const isUploadRequest = typeof url === 'string' && url.includes('upload.upload');
    const timeout = isUploadRequest ? 600000 : 60000; // 上传10分钟，其他1分钟

    // 创建兼容的 AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`⏰ 请求超时 (${timeout/1000}s):`, url);
      controller.abort();
    }, timeout);

    // 如果原来有 signal，需要合并
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    const fetchPromise = fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options?.headers,
        'Content-Type': (options?.headers as Record<string, string>)?.['Content-Type'] || 'application/json',
      },
    }).catch((error) => {
      // 增强错误处理
      if (error.name === 'AbortError') {
        console.error('🚫 请求被中止:', url);
        throw new Error(`请求超时 (${timeout/1000}秒)`);
      }
      console.error('🌐 网络请求失败:', url, error);
      throw error;
    });

    // 清理定时器
    fetchPromise.finally(() => clearTimeout(timeoutId));
    return fetchPromise;
  };
}

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: op =>
            process.env.NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          url: getBaseUrl() + '/api/trpc',
          transformer: superjson, // tRPC 11.4.2: transformer必须在link中配置
          headers() {
            const headers = new Map<string, string>();
            headers.set('x-trpc-source', 'react');
            return Object.fromEntries(headers);
          },
          fetch: createEnhancedFetch(),
        }),
      ],
    })
  );

  // 创建上传专用客户端实例
  const [uploadClient] = useState(() => createUploadClient());

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        <UploadClientProvider client={uploadClient} queryClient={queryClient}>
          {props.children}
        </UploadClientProvider>
      </api.Provider>
    </QueryClientProvider>
  );
}

/**
 * 上传专用的tRPC Provider
 * 为上传操作提供专用的客户端实例
 */
function UploadClientProvider(props: {
  children: React.ReactNode;
  client: ReturnType<typeof createUploadClient>;
  queryClient: QueryClient;
}) {
  // 将上传客户端存储在全局变量中，供上传组件使用
  if (typeof window !== 'undefined') {
    window.__UPLOAD_TRPC_CLIENT__ = props.client;
  }

  return <>{props.children}</>;
}

/**
 * 获取上传专用的tRPC客户端
 * 用于文件上传操作，使用专用域名避免HTTP/2问题
 */
export function getUploadClient() {
  if (typeof window !== 'undefined' && window.__UPLOAD_TRPC_CLIENT__) {
    return window.__UPLOAD_TRPC_CLIENT__;
  }

  // 如果没有找到上传客户端，创建一个新的
  console.warn('⚠️ 上传客户端未找到，创建临时实例');
  return createUploadClient();
}

/**
 * 检查是否为ngrok环境
 */
function isNgrokEnvironment(hostname: string): boolean {
  return hostname.includes('ngrok') || hostname.includes('ngrok-free.app');
}

/**
 * 获取客户端基础URL
 */
function getClientBaseUrl(): string {
  const hostname = window.location.hostname;
  const isNgrok = isNgrokEnvironment(hostname);
  const isDev = process.env.NODE_ENV === 'development';
  const localUrl = process.env.COSEREEDEN_NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (isNgrok && isDev) {
    console.warn('🌐 检测到ngrok环境，为避免网络不稳定，强制使用localhost进行API调用。');
    return localUrl;
  }

  if (isNgrok) {
    console.warn(`🌐 检测到ngrok环境，网络可能不稳定。建议使用 ${localUrl} 进行开发。`);
  }

  return window.location.origin;
}

/**
 * 获取服务端基础URL
 */
function getServerBaseUrl(): string {
  if (process.env.COSEREEDEN_VERCEL_URL) {
    return `https://${process.env.COSEREEDEN_VERCEL_URL}`;
  }

  const defaultPort = process.env.COSEREEDEN_DEFAULT_DEV_PORT || '3000';
  return `http://localhost:${process.env.COSEREEDEN_PORT ?? process.env.PORT ?? defaultPort}`;
}

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return getClientBaseUrl();
  }
  return getServerBaseUrl();
}

/**
 * 获取上传专用的基础URL
 * 用于解决HTTP/2协议问题，上传请求使用专用域名
 */
function getUploadBaseUrl() {
  // 优先使用环境变量配置的上传域名（支持新旧变量名）
  const uploadDomain = process.env.COSEREEDEN_NEXT_PUBLIC_UPLOAD_DOMAIN;
  if (uploadDomain) {
    return uploadDomain;
  }

  // 回退到普通的基础URL
  return getBaseUrl();
}
