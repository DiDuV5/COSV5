/**
 * @fileoverview 标签功能测试页面
 * @description 测试标签创建、搜索和管理功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - React 18+
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { extractHashtags } from '@/lib/tag-utils';
import { extractMentionsFromText } from '@/lib/mention-utils';
import {
  Tag,
  Hash,
  Search,
  Plus,
  ArrowLeft,
  Trash2,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface TagInfo {
  id: string;
  name: string;
  count: number;
  color: string;
  isHot: boolean;
}

export default function TagsTestPage() {
  const [testTags, setTestTags] = useState<TagInfo[]>([
    { id: '1', name: 'cosplay', count: 156, color: 'bg-blue-100 text-blue-800', isHot: true },
    { id: '2', name: '写真', count: 89, color: 'bg-pink-100 text-pink-800', isHot: true },
    { id: '3', name: '动漫', count: 67, color: 'bg-purple-100 text-purple-800', isHot: false },
    { id: '4', name: '摄影', count: 45, color: 'bg-green-100 text-green-800', isHot: false },
    { id: '5', name: '二次元', count: 34, color: 'bg-yellow-100 text-yellow-800', isHot: false },
    { id: '6', name: '原创', count: 23, color: 'bg-red-100 text-red-800', isHot: false },
  ]);

  const [newTagName, setNewTagName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [testText, setTestText] = useState('这是一个测试文本 #cosplay #写真 #动漫 @用户名 #新标签');
  const [extractedTags, setExtractedTags] = useState<string[]>([]);

  // 导入统一的标签提取函数

  // 处理文本解析
  const handleTextParse = () => {
    const tags = extractHashtags(testText);
    const mentions = extractMentionsFromText(testText);
    setExtractedTags([...tags, ...mentions.map((m: string) => `@${m}`)]);
  };

  // 添加新标签
  const addNewTag = () => {
    if (!newTagName.trim()) return;

    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-pink-100 text-pink-800',
      'bg-purple-100 text-purple-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-red-100 text-red-800',
    ];

    const newTag: TagInfo = {
      id: Date.now().toString(),
      name: newTagName.trim(),
      count: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      isHot: false
    };

    setTestTags(prev => [...prev, newTag]);
    setNewTagName('');
  };

  // 删除标签
  const deleteTag = (tagId: string) => {
    setTestTags(prev => prev.filter(tag => tag.id !== tagId));
  };

  // 过滤标签
  const filteredTags = testTags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 格式化数字
  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // 渲染带标签的文本
  const renderTextWithTags = (text: string) => {
    const parts = text.split(/(#[\u4e00-\u9fa5\w]+|@[\u4e00-\u9fa5\w]+)/g);

    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mx-1">
            <Hash className="w-3 h-3 mr-1" />
            {part.substring(1)}
          </span>
        );
      } else if (part.startsWith('@')) {
        return (
          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mx-1">
            @{part.substring(1)}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按钮和页面标题 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/system-tests">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回测试中心
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">标签功能测试</h1>
        <p className="text-gray-600 mt-2">测试标签创建、搜索和管理功能</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：标签管理 */}
        <div className="space-y-6">
          {/* 添加新标签 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                添加新标签
              </CardTitle>
              <CardDescription>
                创建新的标签用于测试
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newTag">标签名称</Label>
                  <Input
                    id="newTag"
                    placeholder="输入标签名称..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNewTag()}
                  />
                </div>
                <Button onClick={addNewTag} disabled={!newTagName.trim()} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  添加标签
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 搜索标签 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                搜索标签
              </CardTitle>
              <CardDescription>
                搜索现有标签
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="search">搜索关键词</Label>
                <Input
                  id="search"
                  placeholder="输入搜索关键词..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 标签列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                标签列表 ({filteredTags.length})
              </CardTitle>
              <CardDescription>
                所有可用的标签
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={tag.color}>
                        #{tag.name}
                      </Badge>
                      {tag.isHot && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          热门
                        </Badge>
                      )}
                      <span className="text-sm text-gray-600">
                        {formatCount(tag.count)} 次使用
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTag(tag.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {filteredTags.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? '没有找到匹配的标签' : '没有标签'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：文本解析测试 */}
        <div className="space-y-6">
          {/* 文本解析 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                文本标签解析
              </CardTitle>
              <CardDescription>
                测试从文本中自动提取标签和用户提及
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testText">测试文本</Label>
                  <textarea
                    id="testText"
                    className="w-full p-3 border rounded-lg resize-none"
                    rows={4}
                    placeholder="输入包含 #标签 和 @用户 的文本..."
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                  />
                </div>

                <Button onClick={handleTextParse} className="w-full">
                  解析标签和提及
                </Button>

                {extractedTags.length > 0 && (
                  <div className="space-y-2">
                    <Label>提取的标签和提及:</Label>
                    <div className="flex flex-wrap gap-2">
                      {extractedTags.map((tag, index) => (
                        <Badge
                          key={index}
                          className={tag.startsWith('@') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
                        >
                          {tag.startsWith('@') ? tag : `#${tag}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 渲染效果预览 */}
          <Card>
            <CardHeader>
              <CardTitle>渲染效果预览</CardTitle>
              <CardDescription>
                查看标签在界面中的显示效果
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">原始文本:</h4>
                  <div className="text-sm text-gray-600">{testText}</div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">渲染效果:</h4>
                  <div className="text-sm leading-relaxed">
                    {renderTextWithTags(testText)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 标签统计 */}
          <Card>
            <CardHeader>
              <CardTitle>标签统计</CardTitle>
              <CardDescription>
                标签使用情况统计
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{testTags.length}</div>
                  <div className="text-sm text-gray-600">总标签数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">
                    {testTags.filter(tag => tag.isHot).length}
                  </div>
                  <div className="text-sm text-gray-600">热门标签</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {testTags.reduce((sum, tag) => sum + tag.count, 0)}
                  </div>
                  <div className="text-sm text-gray-600">总使用次数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(testTags.reduce((sum, tag) => sum + tag.count, 0) / testTags.length)}
                  </div>
                  <div className="text-sm text-gray-600">平均使用次数</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 热门标签 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                热门标签
              </CardTitle>
              <CardDescription>
                使用次数最多的标签
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testTags
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((tag, index) => (
                    <div key={tag.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <Badge className={tag.color}>#{tag.name}</Badge>
                      </div>
                      <span className="text-sm text-gray-600">{formatCount(tag.count)}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 快速链接 */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/create">
            创建内容
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tags">
            标签页面
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/system-tests/system-status">
            系统状态
          </Link>
        </Button>
      </div>
    </div>
  );
}
