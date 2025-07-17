/**
 * @fileoverview Firefox视频兼容性测试页面
 * @description 专门测试Firefox浏览器的视频播放兼容性
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
import { 
  Video, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Monitor,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { OptimizedVideo } from '@/components/media/OptimizedVideo';

interface VideoTestCase {
  id: string;
  name: string;
  description: string;
  videoUrl: string;
  posterUrl?: string;
  codec: string;
  profile: string;
  expectedResult: 'should-work' | 'may-fail' | 'will-fail';
  testResult?: 'success' | 'partial' | 'failed' | 'untested';
  errorMessage?: string;
}

export default function FirefoxVideoTestPage() {
  const [browserInfo, setBrowserInfo] = useState<{
    isFirefox: boolean;
    version: string;
    userAgent: string;
  } | null>(null);

  const [testCases] = useState<VideoTestCase[]>([
    {
      id: '1',
      name: 'H.264 Baseline Profile',
      description: 'Firefox最兼容的H.264编码',
      videoUrl: '/test-videos/h264_baseline.mp4',
      posterUrl: '/test-videos/h264_baseline_poster.jpg',
      codec: 'H.264',
      profile: 'Baseline Level 3.0',
      expectedResult: 'should-work'
    },
    {
      id: '2',
      name: 'H.264 Main Profile',
      description: '标准H.264编码，Firefox支持良好',
      videoUrl: '/test-videos/h264_main.mp4',
      posterUrl: '/test-videos/h264_main_poster.jpg',
      codec: 'H.264',
      profile: 'Main Level 3.1',
      expectedResult: 'should-work'
    },
    {
      id: '3',
      name: 'H.264 High Profile',
      description: '高质量H.264编码，可能有兼容性问题',
      videoUrl: '/test-videos/h264_high.mp4',
      posterUrl: '/test-videos/h264_high_poster.jpg',
      codec: 'H.264',
      profile: 'High Level 4.0',
      expectedResult: 'may-fail'
    },
    {
      id: '4',
      name: 'H.265/HEVC',
      description: 'Firefox不支持H.265编码',
      videoUrl: '/test-videos/h265_hevc.mp4',
      posterUrl: '/test-videos/h265_hevc_poster.jpg',
      codec: 'H.265/HEVC',
      profile: 'Main Level 4.0',
      expectedResult: 'will-fail'
    },
    {
      id: '5',
      name: 'WebM VP8',
      description: 'Firefox原生支持的WebM格式',
      videoUrl: '/test-videos/webm_vp8.webm',
      posterUrl: '/test-videos/webm_vp8_poster.jpg',
      codec: 'VP8',
      profile: 'WebM',
      expectedResult: 'should-work'
    },
    {
      id: '6',
      name: 'WebM VP9',
      description: 'Firefox支持的新一代WebM格式',
      videoUrl: '/test-videos/webm_vp9.webm',
      posterUrl: '/test-videos/webm_vp9_poster.jpg',
      codec: 'VP9',
      profile: 'WebM',
      expectedResult: 'should-work'
    }
  ]);

  const [selectedTest, setSelectedTest] = useState<VideoTestCase | null>(null);
  const [testResults, setTestResults] = useState<Record<string, VideoTestCase['testResult']>>({});

  // 检测浏览器信息
  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isFirefox = userAgent.includes('Firefox');
    const versionMatch = userAgent.match(/Firefox\/(\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : 'Unknown';

    setBrowserInfo({
      isFirefox,
      version,
      userAgent
    });
  }, []);

  // 测试视频播放
  const testVideoPlayback = (testCase: VideoTestCase) => {
    setSelectedTest(testCase);
    setTestResults(prev => ({ ...prev, [testCase.id]: 'untested' }));
  };

  // 处理视频加载成功
  const handleVideoLoadSuccess = (testId: string) => {
    setTestResults(prev => ({ ...prev, [testId]: 'success' }));
  };

  // 处理视频加载失败
  const handleVideoLoadError = (testId: string, error: string) => {
    setTestResults(prev => ({ ...prev, [testId]: 'failed' }));
  };

  // 获取期望结果的颜色
  const getExpectedResultColor = (result: VideoTestCase['expectedResult']) => {
    switch (result) {
      case 'should-work':
        return 'bg-green-100 text-green-800';
      case 'may-fail':
        return 'bg-yellow-100 text-yellow-800';
      case 'will-fail':
        return 'bg-red-100 text-red-800';
    }
  };

  // 获取测试结果图标
  const getTestResultIcon = (result?: VideoTestCase['testResult']) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <RefreshCw className="w-4 h-4 text-gray-400" />;
    }
  };

  // 检查编解码器支持
  const checkCodecSupport = () => {
    const video = document.createElement('video');
    const codecs = [
      { name: 'H.264 Baseline', mime: 'video/mp4; codecs="avc1.42E01E"' },
      { name: 'H.264 Main', mime: 'video/mp4; codecs="avc1.4D401E"' },
      { name: 'H.264 High', mime: 'video/mp4; codecs="avc1.64001E"' },
      { name: 'H.265/HEVC', mime: 'video/mp4; codecs="hev1.1.6.L93.B0"' },
      { name: 'VP8', mime: 'video/webm; codecs="vp8"' },
      { name: 'VP9', mime: 'video/webm; codecs="vp9"' },
    ];

    return codecs.map(codec => ({
      ...codec,
      support: video.canPlayType(codec.mime)
    }));
  };

  const codecSupport = checkCodecSupport();

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
        <h1 className="text-3xl font-bold text-gray-900">Firefox 视频兼容性测试</h1>
        <p className="text-gray-600 mt-2">专门测试Firefox浏览器的视频播放兼容性</p>
      </div>

      {/* 浏览器检测警告 */}
      {browserInfo && !browserInfo.isFirefox && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                当前不是Firefox浏览器，测试结果可能不准确
              </span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              建议在Firefox浏览器中运行此测试以获得准确结果
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：测试用例列表 */}
        <div className="space-y-6">
          {/* 浏览器信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                浏览器信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              {browserInfo && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">浏览器:</span>
                    <span className={browserInfo.isFirefox ? 'text-green-600' : 'text-red-600'}>
                      {browserInfo.isFirefox ? `Firefox ${browserInfo.version}` : '非Firefox浏览器'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">User Agent:</span>
                    <span className="text-xs text-gray-600 max-w-xs truncate">
                      {browserInfo.userAgent}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 编解码器支持 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                编解码器支持
              </CardTitle>
              <CardDescription>
                当前浏览器对各种视频编解码器的支持情况
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {codecSupport.map((codec, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{codec.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{codec.support || '不支持'}</span>
                      {codec.support === 'probably' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : codec.support === 'maybe' ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 测试用例列表 */}
          <Card>
            <CardHeader>
              <CardTitle>视频测试用例</CardTitle>
              <CardDescription>
                点击测试用例开始播放测试
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testCases.map((testCase) => (
                  <div
                    key={testCase.id}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedTest?.id === testCase.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => testVideoPlayback(testCase)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{testCase.name}</h4>
                        <p className="text-xs text-gray-600">{testCase.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTestResultIcon(testResults[testCase.id])}
                        <Badge className={getExpectedResultColor(testCase.expectedResult)}>
                          {testCase.expectedResult === 'should-work' ? '应该成功' :
                           testCase.expectedResult === 'may-fail' ? '可能失败' : '预期失败'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      编码: {testCase.codec} ({testCase.profile})
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：视频播放测试 */}
        <div className="space-y-6">
          {selectedTest ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  视频播放测试
                </CardTitle>
                <CardDescription>
                  {selectedTest.name} - {selectedTest.codec}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 视频播放器 */}
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <OptimizedVideo
                      src={selectedTest.videoUrl}
                      poster={selectedTest.posterUrl}
                      controls={true}
                      className="w-full h-full"
                      onLoadedMetadata={() => handleVideoLoadSuccess(selectedTest.id)}
                      onError={(error) => handleVideoLoadError(selectedTest.id, error.toString())}
                    />
                  </div>

                  {/* 测试信息 */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">编解码器:</span>
                      <div className="text-gray-600">{selectedTest.codec}</div>
                    </div>
                    <div>
                      <span className="font-medium">配置文件:</span>
                      <div className="text-gray-600">{selectedTest.profile}</div>
                    </div>
                    <div>
                      <span className="font-medium">预期结果:</span>
                      <div>
                        <Badge className={getExpectedResultColor(selectedTest.expectedResult)}>
                          {selectedTest.expectedResult === 'should-work' ? '应该成功' :
                           selectedTest.expectedResult === 'may-fail' ? '可能失败' : '预期失败'}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">测试结果:</span>
                      <div className="flex items-center gap-2">
                        {getTestResultIcon(testResults[selectedTest.id])}
                        <span className="text-gray-600">
                          {testResults[selectedTest.id] === 'success' ? '播放成功' :
                           testResults[selectedTest.id] === 'failed' ? '播放失败' :
                           testResults[selectedTest.id] === 'partial' ? '部分成功' : '未测试'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 原生video标签测试 */}
                  <div>
                    <h4 className="font-medium mb-2">原生 video 标签测试</h4>
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <video
                        src={selectedTest.videoUrl}
                        poster={selectedTest.posterUrl}
                        controls
                        className="w-full h-full"
                        onLoadedMetadata={() => console.log('原生video加载成功')}
                        onError={(e) => console.error('原生video加载失败:', e)}
                      >
                        您的浏览器不支持视频播放
                      </video>
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
                  选择测试用例
                </h3>
                <p className="text-gray-500">
                  点击左侧的测试用例开始视频播放测试
                </p>
              </CardContent>
            </Card>
          )}

          {/* Firefox特殊说明 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Firefox 特殊说明
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <strong className="text-blue-800">推荐编码:</strong>
                  <p className="text-blue-700 mt-1">
                    H.264 Baseline Profile Level 3.0，兼容性最好
                  </p>
                </div>
                
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <strong className="text-yellow-800">注意事项:</strong>
                  <p className="text-yellow-700 mt-1">
                    Firefox不支持H.265/HEVC编码，需要转码为H.264
                  </p>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <strong className="text-green-800">WebM支持:</strong>
                  <p className="text-green-700 mt-1">
                    Firefox原生支持WebM格式（VP8/VP9），可作为备选方案
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 快速链接 */}
      <div className="mt-8 flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/admin/system-tests/video-transcoding">
            视频转码测试
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/admin/system-tests/media">
            媒体测试
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
