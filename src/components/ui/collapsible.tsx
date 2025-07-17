/**
 * @fileoverview Collapsible UI 组件
 * @description 基于 Radix UI 的可折叠组件
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - @radix-ui/react-collapsible: ^1.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
