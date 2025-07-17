/**
 * @fileoverview 视频转码测试页面
 * @description 测试视频转码功能和兼容性
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

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Video, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  ArrowLeft,
  Upload,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { OptimizedVideo } from '@/components/media/OptimizedVideo';

interface VideoTestFile {
  id: string;
  name: string;
  originalCodec: string;
  targetCodec: string;
  url: string;
  transcodedUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export default function VideoTranscodingTestPage() {
  const [testFiles, setTestFiles] = useState<VideoTestFile[]>([]);
  const [isPending, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<VideoTestFile | null>(null);

  // 模拟测试文件数据
  useEffect(() => {
    const mockFiles: VideoTestFile[] = [
      {
        id: '1',
        name: 'test_h265_video.mp4',
        originalCodec: 'H.265/HEVC',
        targetCodec: 'H.264',
        url: '/uploads/test_h265_video.mp4',
        transcodedUrl: '/uploads/test_h265_video_h264.mp4',
        status: 'completed',
        progress: 100
      },
      {
        id: '2',
        name: 'sample_4k_video.mov',
        originalCodec: 'H.264 4K',
        targetCodec: 'H.264 1080p',
        url: '/uploads/sample_4k_video.mov',
        status: 'processing',
        progress: 65
      },
      {
        id: '3',
        name: 'corrupted_video.avi',
        originalCodec: 'Unknown',
        targetCodec: 'H.264',
        url: '/uploads/corrupted_video.avi',
        status: 'failed',
        progress: 0,
        error: '文件损坏或格式不支持'
      }
    ];

    setTimeout(() => {
      setTestFiles(mockFiles);
      setIsLoading(false);
    }, 1000);
  }, []);

  // 开始转码测试
  const startTranscoding = (fileId: string) => {
    setTestFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, status: 'processing', progress: 0 }
        : file
    ));

    // 模拟转码进度
    const interval = setInterval(() => {
      setTestFiles(prev => prev.map(file => {
        if (file.id === fileId && file.status === 'processing') {
          const newProgress = Math.min(file.progress + Math.random() * 20, 100);
          if (newProgress >= 100) {
            clearInterval(interval);
            return {
              ...file,
              status: 'completed',
              progress: 100,
              transcodedUrl: file.url.replace(/\.[^/.]+$/, '_h264.mp4')
            };
          }
          return { ...file, progress: newProgress };
        }
        return file;
      }));
    }, 500);
  };

  // 重置测试
  const resetTest = (fileId: string) => {
    setTestFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, status: 'pending', progress: 0, error: undefined, transcodedUrl: undefined }
        : file
    ));
  };

  const getStatusIcon = (status: VideoTestFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: VideoTestFile['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">加载测试数据...</span>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-gray-900">视频转码测试</h1>
        <p className="text-gray-600 mt-2">测试视频转码功能和浏览器兼容性</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：转码任务列表 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                转码任务列表
              </CardTitle>
              <CardDescription>
                测试不同格式视频的转码功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(file.status)}
                        <h4 className="font-medium text-sm">{file.name}</h4>
                      </div>
                      <Badge className={getStatusColor(file.status)}>
                        {file.status}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-2">
                      {file.originalCodec} → {file.targetCodec}
                    </div>
                    
                    {file.status === 'processing' && (
                      <div className="space-y-1">
                        <Progress value={file.progress} className="h-2" />
                        <div className="text-xs text-gray-500">
                          {Math.round(file.progress)}% 完成
                        </div>
                      </div>
                    )}
                    
                    {file.error && (
                      <div className="text-xs text-red-600 mt-1">
                        错误: {file.error}
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-3">
                      {file.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startTranscoding(file.id);
                          }}
                        >
                          开始转码
                        </Button>
                      )}
                      {(file.status === 'failed' || file.status === 'completed') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            resetTest(file.id);
                          }}
                        >
                          重新测试
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 转码统计 */}
          <Card>
            <CardHeader>
              <CardTitle>转码统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {testFiles.filter(f => f.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">成功</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {testFiles.filter(f => f.status === 'processing').length}
                  </div>
                  <div className="text-sm text-gray-600">进行中</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {testFiles.filter(f => f.status === 'failed').length}
                  </div>
                  <div className="text-sm text-gray-600">失败</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：视频预览 */}
        <div className="space-y-6">
          {selectedFile ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  视频预览
                </CardTitle>
                <CardDescription>
                  {selectedFile.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 原始视频 */}
                  <div>
                    <h4 className="font-medium mb-2">原始视频 ({selectedFile.originalCodec})</h4>
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <OptimizedVideo
                        src={selectedFile.url}
                        controls={true}
                        className="w-full h-full"
                        onError={() => console.error('原始视频播放失败')}
                      />
                    </div>
                  </div>

                  {/* 转码后视频 */}
                  {selectedFile.transcodedUrl && (
                    <div>
                      <h4 className="font-medium mb-2">转码后视频 ({selectedFile.targetCodec})</h4>
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <OptimizedVideo
                          src={selectedFile.transcodedUrl}
                          controls={true}
                          className="w-full h-full"
                          onError={() => console.error('转码视频播放失败')}
                        />
                      </div>
                    </div>
                  )}

                  {/* 文件信息 */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">状态:</span>
                      <div className="text-gray-600">{selectedFile.status}</div>
                    </div>
                    <div>
                      <span className="font-medium">进度:</span>
                      <div className="text-gray-600">{selectedFile.progress}%</div>
                    </div>
                    <div>
                      <span className="font-medium">原始编码:</span>
                      <div className="text-gray-600">{selectedFile.originalCodec}</div>
                    </div>
                    <div>
                      <span className="font-medium">目标编码:</span>
                      <div className="text-gray-600">{selectedFile.targetCodec}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  选择视频文件
                </h3>
                <p className="text-gray-500">
                  点击左侧的视频文件来查看转码详情和预览
                </p>
              </CardContent>
            </Card>
          )}

          {/* 浏览器兼容性 */}
          <Card>
            <CardHeader>
              <CardTitle>浏览器兼容性</CardTitle>
              <CardDescription>
                当前浏览器对视频编码的支持情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { codec: 'video/mp4; codecs="avc1.42E01E"', name: 'H.264 Baseline' },
                  { codec: 'video/mp4; codecs="avc1.4D401E"', name: 'H.264 Main' },
                  { codec: 'video/mp4; codecs="avc1.64001E"', name: 'H.264 High' },
                  { codec: 'video/mp4; codecs="hev1.1.6.L93.B0"', name: 'H.265/HEVC' },
                ].map(({ codec, name }) => {
                  const supported = document.createElement('video').canPlayType(codec);
                  return (
                    <div key={codec} className="flex items-center justify-between">
                      <span className="text-sm">{name}</span>
                      <div className="flex items-center gap-2">
                        {supported === 'probably' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : supported === 'maybe' ? (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-xs text-gray-500">
                          {supported || '不支持'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/admin/system-tests/upload">
            <Upload className="w-4 h-4 mr-2" />
            上传测试
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/settings">
            <Settings className="w-4 h-4 mr-2" />
            系统设置
          </Link>
        </Button>
      </div>
    </div>
  );
}
