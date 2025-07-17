/**
 * @fileoverview 智能切换建议组件
 * @description 根据当前状态提供智能的操作建议
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  Camera,
  Sparkles,
  Palette,
  Star,
  Heart,
  Eye,
  Settings,
  CheckCircle,
  ArrowRight,
  Download
} from 'lucide-react';

interface SmartSuggestionsProps {
  activeTab: string;
  title: string;
  uploadedFilesCount: number;
  extractedTagsCount: number;
  onTabChange: (tab: string) => void;
}

export function SmartSuggestions({
  activeTab,
  title,
  uploadedFilesCount,
  extractedTagsCount,
  onTabChange,
}: SmartSuggestionsProps) {
  // 智能切换建议 - 草稿列表页面
  if (activeTab === 'drafts') {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-800">管理您的创作草稿</h4>
                <p className="text-xs text-blue-600">选择一个草稿继续编辑，或开始新的创作</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onTabChange('content')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Star className="w-4 h-4 mr-2" />
              开始创作
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 智能切换建议 - 资源下载页面
  if (activeTab === 'downloads') {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Download className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-800">管理您的资源下载</h4>
                <p className="text-xs text-blue-600">为作品添加下载链接，让用户获取您的精彩资源</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onTabChange('content')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Star className="w-4 h-4 mr-2" />
              返回编辑
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 智能切换建议 - 作品信息页面
  if (uploadedFilesCount === 0 && activeTab === 'content') {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Upload className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-amber-800">还没有上传媒体文件</h4>
                <p className="text-xs text-amber-600">填写完基本信息后，记得上传一些精彩的作品</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onTabChange('media')}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              上传媒体
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 完成提示 - 作品信息页面
  if (uploadedFilesCount > 0 && title && activeTab === 'content') {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-green-800">作品信息已完成！</h4>
                <p className="text-xs text-green-600">
                  已上传 {uploadedFilesCount} 个文件，标题已填写
                  {extractedTagsCount > 0 && `，提取了 ${extractedTagsCount} 个标签`}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onTabChange('preview')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Eye className="w-4 h-4 mr-2" />
              查看预览
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 智能切换建议 - 媒体页面
  if (uploadedFilesCount > 0 && title && activeTab === 'media') {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-green-800">媒体文件已准备就绪！</h4>
                <p className="text-xs text-green-600">查看预览效果或配置发布设置</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onTabChange('preview')}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                预览
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onTabChange('settings')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                发布设置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (uploadedFilesCount > 0 && !title && activeTab === 'media') {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-orange-800">媒体文件已上传</h4>
                <p className="text-xs text-orange-600">记得回到作品信息填写标题和描述</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onTabChange('content')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Palette className="w-4 h-4 mr-2" />
              完善信息
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 预览页面建议
  if (uploadedFilesCount > 0 && title && activeTab === 'preview') {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Eye className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-purple-800">预览效果很棒！</h4>
                <p className="text-xs text-purple-600">现在可以配置发布设置并发布作品</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onTabChange('settings')}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              发布设置
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === 'preview' && (!title || uploadedFilesCount === 0)) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-orange-800">完善作品信息</h4>
                <p className="text-xs text-orange-600">
                  {!title && !uploadedFilesCount && '需要填写标题并上传媒体文件'}
                  {!title && uploadedFilesCount > 0 && '需要填写作品标题'}
                  {title && uploadedFilesCount === 0 && '需要上传媒体文件'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onTabChange(!title ? 'content' : 'media')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {!title ? (
                <>
                  <Palette className="w-4 h-4 mr-2" />
                  填写信息
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  上传媒体
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 设置页面建议
  if (uploadedFilesCount > 0 && title && activeTab === 'settings') {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-800">准备就绪，可以发布！</h4>
              <p className="text-xs text-green-600">
                作品信息完整，媒体文件已上传，发布设置已配置
              </p>
            </div>
            <div className="flex items-center space-x-1 text-green-600">
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium">一切就绪</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === 'settings' && (!title || uploadedFilesCount === 0)) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-orange-800">配置发布设置</h4>
                <p className="text-xs text-orange-600">
                  {!title && !uploadedFilesCount && '需要先完成作品信息和媒体上传'}
                  {!title && uploadedFilesCount > 0 && '需要先填写作品标题'}
                  {title && uploadedFilesCount === 0 && '需要先上传媒体文件'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => onTabChange(!title ? 'content' : 'media')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {!title ? (
                <>
                  <Palette className="w-4 h-4 mr-2" />
                  填写信息
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  上传媒体
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
