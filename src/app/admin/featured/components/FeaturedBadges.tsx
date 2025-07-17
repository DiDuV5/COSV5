/**
 * @fileoverview 精选内容徽章组件
 * @description 提供精选内容相关的徽章组件
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import { Badge } from "@/components/ui/badge";
import { getStatusInfo, getContentTypeInfo, type FeaturedItem } from "../utils/featured-utils";

/**
 * 状态徽章组件
 */
export function StatusBadge({ item }: { item: FeaturedItem }) {
  const statusInfo = getStatusInfo(item);
  return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
}

/**
 * 内容类型徽章组件
 */
export function ContentTypeBadge({ type }: { type: string }) {
  const typeInfo = getContentTypeInfo(type);
  return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
}
