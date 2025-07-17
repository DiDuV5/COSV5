/**
 * @fileoverview 转码后视频测试页面 - 重构后的模块化入口
 * @description 使用模块化架构重构的视频测试页面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 2.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - React 18+
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 模块化重构，拆分为多个专门组件
 */

import { ConvertedVideosPage } from './index';

/**
 * 转码后视频测试页面
 * @returns JSX元素
 */
export default function ConvertedVideosTestPage() {
  return <ConvertedVideosPage />;
}
