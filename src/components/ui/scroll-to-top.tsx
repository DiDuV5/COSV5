/**
 * @fileoverview 回到顶部按钮组件
 * @description 当页面滚动到一定位置时显示的回到顶部按钮
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Lucide React
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrollToTopProps {
  threshold?: number; // 显示按钮的滚动阈值
  className?: string;
}

export function ScrollToTop({ 
  threshold = 400, 
  className = '' 
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsVisible(scrollTop > threshold);
    };

    // 添加滚动监听器
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // 初始检查
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={`fixed bottom-6 right-6 z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white ${className}`}
      aria-label="回到顶部"
    >
      <ChevronUp className="w-5 h-5" />
    </Button>
  );
}
