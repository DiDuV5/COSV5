/**
 * @fileoverview Motion组件动态导入包装器
 * @description 解决framer-motion在服务端渲染时的模块解析问题
 */

'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// 动态导入framer-motion组件，避免SSR问题
const MotionDiv = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  {
    ssr: false,
    loading: () => <div />,
  }
);

const MotionSpan = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.span),
  {
    ssr: false,
    loading: () => <span />,
  }
);

const MotionButton = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.button),
  {
    ssr: false,
    loading: () => <button />,
  }
);

const AnimatePresenceComponent = dynamic(
  () => import('framer-motion').then((mod) => mod.AnimatePresence),
  {
    ssr: false,
    loading: () => <></>,
  }
);

// 导出包装后的组件
export { MotionDiv, MotionSpan, MotionButton, AnimatePresenceComponent as AnimatePresence };

// 默认的motion属性类型
export interface MotionProps {
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  whileHover?: any;
  whileTap?: any;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  style?: React.CSSProperties;
  [key: string]: any;
}
