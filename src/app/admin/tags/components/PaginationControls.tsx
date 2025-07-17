/**
 * @fileoverview 分页控制组件
 * @description 提供分页导航功能
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { PaginationControlsProps } from "../types";
import { generatePaginationText } from "../utils";

export function PaginationControls({
  pagination,
  currentPage,
  onPageChange,
}: PaginationControlsProps) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { page, limit, total, totalPages } = pagination;

  // 生成页码按钮
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      // 如果总页数不多，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 复杂的分页逻辑
      if (currentPage <= 4) {
        // 当前页在前面
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // 当前页在后面
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div className="flex items-center justify-between mt-6">
      {/* 分页信息 */}
      <div className="text-sm text-gray-600">
        {generatePaginationText(currentPage, limit, total)}
      </div>

      {/* 分页控制 */}
      <div className="flex items-center gap-2">
        {/* 首页 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="首页"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* 上一页 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="上一页"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* 页码按钮 */}
        {pageNumbers.map((pageNum, index) => {
          if (pageNum === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                ...
              </span>
            );
          }

          const pageNumber = pageNum as number;
          const isCurrentPage = pageNumber === currentPage;

          return (
            <Button
              key={pageNumber}
              variant={isCurrentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNumber)}
              className={isCurrentPage ? "bg-blue-600 text-white" : ""}
            >
              {pageNumber}
            </Button>
          );
        })}

        {/* 下一页 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="下一页"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* 末页 */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="末页"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
