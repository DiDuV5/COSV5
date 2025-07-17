/**
 * @fileoverview 标签管理组件
 * @description 处理帖子编辑中的标签添加和删除，从原 posts/[id]/edit/page.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export interface TagManagementSectionProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
}

/**
 * 标签管理组件
 * 负责处理标签的添加、删除和展示
 */
export function TagManagementSection({
  tags,
  onTagsChange,
  maxTags = 10,
  placeholder = '输入标签名称',
}: TagManagementSectionProps) {
  const [tagInput, setTagInput] = useState('');

  /**
   * 处理标签添加
   */
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    
    // 验证标签
    if (!trimmedTag) {
      return;
    }

    if (tags.includes(trimmedTag)) {
      return; // 标签已存在
    }

    if (tags.length >= maxTags) {
      return; // 达到最大标签数量
    }

    // 添加标签
    onTagsChange([...tags, trimmedTag]);
    setTagInput('');
  };

  /**
   * 处理标签删除
   */
  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  /**
   * 处理输入框回车事件
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  /**
   * 验证标签输入
   */
  const isValidTag = (tag: string): boolean => {
    const trimmed = tag.trim();
    return trimmed.length > 0 && trimmed.length <= 20 && /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(trimmed);
  };

  /**
   * 获取输入状态
   */
  const getInputStatus = () => {
    if (!tagInput.trim()) {
      return { isValid: true, message: '' };
    }

    if (tags.includes(tagInput.trim())) {
      return { isValid: false, message: '标签已存在' };
    }

    if (tags.length >= maxTags) {
      return { isValid: false, message: `最多只能添加 ${maxTags} 个标签` };
    }

    if (!isValidTag(tagInput)) {
      return { isValid: false, message: '标签只能包含字母、数字、中文、下划线和连字符，长度不超过20个字符' };
    }

    return { isValid: true, message: '' };
  };

  const inputStatus = getInputStatus();

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tags">标签</Label>
        <div className="flex space-x-2 mt-1">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className={inputStatus.isValid ? '' : 'border-destructive'}
            maxLength={20}
          />
          <Button 
            type="button" 
            onClick={handleAddTag}
            disabled={!inputStatus.isValid || !tagInput.trim()}
            size="sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* 输入状态提示 */}
        {inputStatus.message && (
          <p className={`text-xs mt-1 ${inputStatus.isValid ? 'text-muted-foreground' : 'text-destructive'}`}>
            {inputStatus.message}
          </p>
        )}
        
        {/* 标签计数 */}
        <p className="text-xs text-muted-foreground mt-1">
          {tags.length}/{maxTags} 个标签
        </p>
      </div>

      {/* 标签展示 */}
      {tags.length > 0 && (
        <div className="space-y-2">
          <Label>已添加的标签</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-destructive transition-colors"
                  aria-label={`删除标签 ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 标签使用提示 */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• 标签有助于其他用户发现您的内容</p>
        <p>• 使用相关的关键词作为标签</p>
        <p>• 标签只能包含字母、数字、中文、下划线和连字符</p>
        <p>• 每个标签最多20个字符</p>
      </div>
    </div>
  );
}

/**
 * 标签管理组件的默认导出
 */
export default TagManagementSection;
