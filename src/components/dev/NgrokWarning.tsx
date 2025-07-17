'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, ExternalLink } from 'lucide-react';

export function NgrokWarning() {
  const [isVisible, setIsVisible] = useState(false);
  const [isNgrok, setIsNgrok] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isNgrokEnv = hostname.includes('ngrok') || hostname.includes('ngrok-free.app');
      const isDev = process.env.NODE_ENV === 'development';
      
      if (isNgrokEnv && isDev) {
        setIsNgrok(true);
        // 检查是否已经关闭过警告
        const dismissed = localStorage.getItem('ngrok-warning-dismissed');
        if (!dismissed) {
          setIsVisible(true);
        }
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('ngrok-warning-dismissed', 'true');
  };

  const handleGoToLocalhost = () => {
    window.open('http://localhost:3000' + window.location.pathname, '_blank');
  };

  if (!isNgrok || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-2xl mx-auto">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              网络连接不稳定警告
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                检测到您正在使用ngrok环境，这可能导致文件上传失败。
                为了获得最佳体验，建议您直接访问本地开发服务器。
              </p>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleGoToLocalhost}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                打开 localhost:3000
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-800 bg-transparent hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                我知道了
              </button>
            </div>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={handleDismiss}
                className="inline-flex rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
              >
                <span className="sr-only">关闭</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
