/**
 * @fileoverview 标签组件
 * @description 可复用的标签组件，支持彩色气泡样式和点击跳转
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - React 18+
 * - Next.js 14+
 * - Tailwind CSS
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { extractHashtags } from '@/lib/tag-utils';

interface TagProps {
  name: string;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  showCount?: boolean;
  clickable?: boolean;
  className?: string;
  onClick?: () => void;
}

// 格式化数字显示
const formatCount = (count: number): string => {
  if (count < 1000) {
    return count.toString();
  }
  return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
};

// 根据热门程度生成颜色
const getHeatColor = (count: number = 0): string => {
  if (count < 5) return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  if (count < 20) return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
  if (count < 50) return 'bg-green-100 text-green-700 hover:bg-green-200';
  if (count < 100) return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
  if (count < 200) return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
  return 'bg-red-100 text-red-700 hover:bg-red-200';
};

export function Tag({
  name,
  count = 0,
  size = 'md',
  variant = 'default',
  showCount = true,
  clickable = true,
  className,
  onClick,
}: TagProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const variantClasses = {
    default: getHeatColor(count),
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  };

  const baseClasses = cn(
    'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
    sizeClasses[size],
    variant === 'default' ? getHeatColor(count) : variantClasses[variant],
    clickable && 'cursor-pointer',
    className
  );

  const content = (
    <>
      <span>{name}</span>
      {showCount && count !== undefined && count > 0 && (
        <span className="opacity-75 font-normal ml-1">
          {formatCount(count)}
        </span>
      )}
    </>
  );

  if (clickable && !onClick) {
    return (
      <Link
        href={`/tags/${encodeURIComponent(name)}`}
        className={baseClasses}
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseClasses}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={baseClasses}>
      {content}
    </span>
  );
}

// 标签列表组件
interface TagListProps {
  tags: Array<{ name: string; count?: number }>;
  maxTags?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  showCount?: boolean;
  className?: string;
}



export function TagList({
  tags,
  maxTags,
  size = 'md',
  variant = 'default',
  showCount = true,
  className,
}: TagListProps) {
  const displayTags = maxTags ? tags.slice(0, maxTags) : tags;
  const remainingCount = maxTags && tags.length > maxTags ? tags.length - maxTags : 0;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {displayTags.map((tag, index) => (
        <Tag
          key={`${tag.name}-${index}`}
          name={tag.name}
          count={tag.count}
          size={size}
          variant={variant}
          showCount={showCount}
        />
      ))}
      {remainingCount > 0 && (
        <Tag
          name={`+${remainingCount} 更多`}
          size={size}
          variant="outline"
          showCount={false}
          clickable={false}
        />
      )}
    </div>
  );
}



// 标签输入组件
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder = '输入标签，用逗号分隔',
  maxTags = 10,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // 实时解析标签
    if (newValue.includes(',')) {
      const newTags = newValue
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && !value.includes(tag));

      if (newTags.length > 0 && value.length + newTags.length <= maxTags) {
        onChange([...value, ...newTags]);
        setInputValue('');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag) && value.length < maxTags) {
        onChange([...value, newTag]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        {value.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
          >
{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 text-blue-500 hover:text-blue-700"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent"
          disabled={value.length >= maxTags}
        />
      </div>
      <div className="text-xs text-gray-500">
        {value.length}/{maxTags} 个标签
        {value.length < maxTags && ' • 按回车或逗号添加标签'}
      </div>
    </div>
  );
}

// 重新导出统一的标签工具函数
export {
  extractHashtags,
  extractTagsFromTitle,
  extractAllTags,
  removeHashtagSymbols,
  processTextContent,
  isValidTagName,
  formatTagsForStorage,
  parseTagsFromStorage,
  calculateTagHeatScore,
} from '@/lib/tag-utils';

// 保持向后兼容的别名函数
/**
 * @deprecated 请使用 extractHashtags from '@/lib/tag-utils'
 */
export const extractHashtagsFromContent = (content: string): string[] => {
  return extractHashtags(content);
};

// 渲染带标签的内容（已弃用，使用新的分离式显示）
export const renderContentWithTags = (content: string): React.ReactNode => {
  const hashtagRegex = /#([^\s#]+)/g;
  const parts = content.split(hashtagRegex);

  return parts.map((part, index) => {
    if (index % 2 === 1) {
      // 这是一个标签
      return (
        <Tag
          key={index}
          name={part}
          size="sm"
          showCount={false}
          className="inline-flex mx-1"
        />
      );
    }
    return part;
  });
};
