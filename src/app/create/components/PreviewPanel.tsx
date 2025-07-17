/**
 * @fileoverview 预览面板组件
 * @description 实时预览作品发布后的效果
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  ImageIcon, 
  Heart, 
  MessageSquare, 
  Share2 
} from 'lucide-react';

interface PreviewPanelProps {
  title: string;
  description?: string;
  uploadedFilesCount: number;
  extractedTags: string[];
}

export function PreviewPanel({
  title,
  description,
  uploadedFilesCount,
  extractedTags,
}: PreviewPanelProps) {
  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">实时预览</CardTitle>
            <CardDescription className="text-sm">
              查看作品发布后的效果
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="space-y-3">
            {/* 预览标题 */}
            <div>
              <h3 className="font-semibold text-gray-900 line-clamp-2">
                {title || '作品标题'}
              </h3>
            </div>

            {/* 预览描述 */}
            {description && (
              <p className="text-sm text-gray-600 line-clamp-3">
                {description}
              </p>
            )}

            {/* 预览媒体 */}
            {uploadedFilesCount > 0 && (
              <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">{uploadedFilesCount} 个媒体文件</p>
                </div>
              </div>
            )}

            {/* 预览标签 */}
            {extractedTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {extractedTags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {extractedTags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{extractedTags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* 预览互动 */}
            <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Heart className="w-4 h-4" />
                  <span>0</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>0</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>0</span>
                </div>
              </div>
              <Share2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
