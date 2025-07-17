/**
 * @fileoverview 媒体测试页面
 * @description 用于诊断图片和视频显示问题的综合测试页面
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - Next.js 14+
 * - React 18+
 * - VideoPlayer组件
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 * - 2024-01-XX: 移动到admin/system-tests目录
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { OptimizedVideo } from '@/components/media/OptimizedVideo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Image as ImageIcon,
  Video,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface MediaTestResult {
  url: string;
  status: 'loading' | 'success' | 'error';
  error?: string;
  responseTime?: number;
}

interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: 'IMAGE' | 'VIDEO';
  width?: number;
  height?: number;
  duration?: number;
}

export default function TestMediaPage() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [testResults, setTestResults] = useState<Record<string, MediaTestResult>>({});
  const [loading, setLoading] = useState(true);

  // 测试媒体文件的可访问性
  const testMediaAccess = async (url: string): Promise<MediaTestResult> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          url,
          status: 'success',
          responseTime
        };
      } else {
        return {
          url,
          status: 'error',
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        url,
        status: 'error',
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : '网络错误',
        responseTime
      };
    }
  };

  // 获取媒体文件列表
  const fetchMediaFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trpc/post.getAll?batch=1&input=%7B%220%22%3A%7B%22json%22%3A%7B%22limit%22%3A10%2C%22sortBy%22%3A%22latest%22%2C%22status%22%3A%22PUBLISHED%22%2C%22cursor%22%3Anull%7D%2C%22meta%22%3A%7B%22values%22%3A%7B%22cursor%22%3A%5B%22undefined%22%5D%7D%7D%7D%7D');
      const data = await response.json();
      
      if (data[0]?.result?.data?.json?.posts) {
        const allMedia: MediaFile[] = [];
        
        data[0].result.data.json.posts.forEach((post: any) => {
          if (post.media && post.media.length > 0) {
            post.media.forEach((media: any) => {
              allMedia.push({
                id: media.id,
                filename: media.filename,
                originalName: media.originalName,
                url: media.url,
                thumbnailUrl: media.thumbnailUrl,
                mediaType: media.mediaType,
                width: media.width,
                height: media.height,
                duration: media.duration
              });
            });
          }
        });
        
        setMediaFiles(allMedia);
        
        // 测试所有媒体文件的可访问性
        const testPromises = allMedia.map(async (media) => {
          const results: Record<string, MediaTestResult> = {};
          
          // 测试主文件
          results[media.url] = await testMediaAccess(media.url);
          
          // 测试缩略图
          if (media.thumbnailUrl) {
            results[media.thumbnailUrl] = await testMediaAccess(media.thumbnailUrl);
          }
          
          return results;
        });
        
        const allResults = await Promise.all(testPromises);
        const combinedResults = allResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setTestResults(combinedResults);
      }
    } catch (error) {
      console.error('获取媒体文件失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  // 渲染测试结果状态
  const renderTestStatus = (url: string) => {
    const result = testResults[url];
    
    if (!result) {
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
    
    switch (result.status) {
      case 'loading':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'success':
        return (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">{result.responseTime}ms</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-500" title={result.error}>错误</span>
          </div>
        );
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // 格式化文件大小
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">加载媒体文件...</span>
        </div>
      </div>
    );
  }

  const imageFiles = mediaFiles.filter(f => f.mediaType === 'IMAGE');
  const videoFiles = mediaFiles.filter(f => f.mediaType === 'VIDEO');

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
        <h1 className="text-3xl font-bold mb-2">媒体文件诊断测试</h1>
        <p className="text-gray-600">
          检测图片和视频文件的显示和播放问题
        </p>
        <div className="flex gap-4 mt-4">
          <Button onClick={fetchMediaFiles} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新测试
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="images">图片测试</TabsTrigger>
          <TabsTrigger value="videos">视频测试</TabsTrigger>
          <TabsTrigger value="browser">浏览器兼容性</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  图片文件
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{imageFiles.length}</div>
                <p className="text-sm text-gray-600">
                  {imageFiles.filter(f => testResults[f.url]?.status === 'success').length} 个可访问
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  视频文件
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{videoFiles.length}</div>
                <p className="text-sm text-gray-600">
                  {videoFiles.filter(f => testResults[f.url]?.status === 'success').length} 个可访问
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>缩略图状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mediaFiles.filter(f => f.thumbnailUrl && testResults[f.thumbnailUrl]?.status === 'success').length}
                </div>
                <p className="text-sm text-gray-600">
                  / {mediaFiles.filter(f => f.thumbnailUrl).length} 个缩略图可用
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="images" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {imageFiles.slice(0, 6).map((file) => (
              <Card key={file.id}>
                <CardHeader>
                  <CardTitle className="text-sm truncate">{file.originalName}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {renderTestStatus(file.url)}
                    <span>主图</span>
                    {file.thumbnailUrl && (
                      <>
                        {renderTestStatus(file.thumbnailUrl)}
                        <span>缩略图</span>
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 缩略图测试 */}
                    {file.thumbnailUrl && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">缩略图显示测试</h4>
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={file.thumbnailUrl}
                            alt={`${file.originalName} 缩略图`}
                            width={200}
                            height={200}
                            className="w-full h-full object-cover"
                            onError={() => console.error('缩略图加载失败:', file.thumbnailUrl)}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* 原图测试 */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">原图显示测试</h4>
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={file.url}
                          alt={file.originalName}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                          onError={() => console.error('原图加载失败:', file.url)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videoFiles.slice(0, 4).map((file) => (
              <Card key={file.id}>
                <CardHeader>
                  <CardTitle className="text-sm truncate">{file.originalName}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {renderTestStatus(file.url)}
                    <span>视频</span>
                    {file.thumbnailUrl && (
                      <>
                        {renderTestStatus(file.thumbnailUrl)}
                        <span>缩略图</span>
                      </>
                    )}
                    {file.duration && (
                      <Badge variant="outline">{formatDuration(file.duration)}</Badge>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* 视频播放器测试 */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">VideoPlayer 组件测试</h4>
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <OptimizedVideo
                          src={file.url}
                          poster={file.thumbnailUrl}
                          controls={true}
                          className="w-full h-full"
                          onError={(error) => console.error('OptimizedVideo 错误:', error)}
                          onLoadedMetadata={(metadata) => console.log('视频元数据:', metadata)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="browser" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>浏览器兼容性检测</CardTitle>
              <CardDescription>
                检测当前浏览器对不同媒体格式的支持情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">视频编码支持</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { codec: 'video/mp4; codecs="avc1.42E01E"', name: 'H.264' },
                      { codec: 'video/mp4; codecs="hev1.1.6.L93.B0"', name: 'H.265/HEVC' },
                      { codec: 'video/webm; codecs="vp8"', name: 'VP8' },
                      { codec: 'video/webm; codecs="vp9"', name: 'VP9' },
                    ].map(({ codec, name }) => {
                      const supported = document.createElement('video').canPlayType(codec);
                      return (
                        <div key={codec} className="flex items-center gap-2">
                          {supported === 'probably' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : supported === 'maybe' ? (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm">{name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
