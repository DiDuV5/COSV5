"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export default function UUIDConsistencyTestPage() {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<string>('');

  const runTests = async () => {
    setIsRunning(true);
    setTestResults({});
    setSummary('');

    try {
      // 运行UUID一致性测试
      const { runUUIDConsistencyTests } = await import('@/scripts/test-uuid-flow');
      const result = await runUUIDConsistencyTests();
      
      setTestResults(result.results);
      setSummary(result.summary);
    } catch (error) {
      console.error('测试执行失败:', error);
      setSummary('测试执行失败: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsRunning(false);
    }
  };

  const testURL = () => {
    const testUUID = crypto.randomUUID();
    const baseUrl = window.location.origin;
    const testUrl = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(testUUID)}`;
    
    console.log('🔗 测试URL:', testUrl);
    
    // 解析URL
    const url = new URL(testUrl);
    const extractedToken = url.searchParams.get('token');
    
    console.log('🔍 提取结果:', {
      original: testUUID,
      extracted: extractedToken,
      consistent: testUUID === extractedToken
    });

    // 在新标签页中打开测试URL（仅用于测试，不会真正验证）
    window.open(testUrl, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">UUID令牌一致性测试</h1>
        <p className="text-gray-600">
          测试UUID令牌在生成、编码、传输和解析过程中的一致性
        </p>
      </div>

      <div className="space-y-6">
        {/* 控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle>测试控制</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={runTests} 
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? '运行中...' : '运行完整测试套件'}
              </Button>
              <Button 
                onClick={testURL} 
                variant="outline"
                className="flex-1"
              >
                测试URL生成和解析
              </Button>
            </div>
            
            {summary && (
              <div className={`p-4 rounded-lg ${
                summary.includes('失败') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
              }`}>
                <strong>测试结果:</strong> {summary}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 测试结果 */}
        {Object.keys(testResults).length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(testResults).map(([testName, result]) => (
              <Card key={testName}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                      {result.success ? '✅' : '❌'}
                    </span>
                    {testName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-2">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        查看详情
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 说明文档 */}
        <Card>
          <CardHeader>
            <CardTitle>测试说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">测试项目:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>UUID生成:</strong> 验证UUID格式和长度是否正确</li>
                <li><strong>URL编码:</strong> 测试encodeURIComponent和URLSearchParams的一致性</li>
                <li><strong>URL生成:</strong> 验证统一URL生成器的正确性</li>
                <li><strong>格式处理:</strong> 测试不同大小写UUID的处理</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">如何使用:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>点击"运行完整测试套件"执行所有测试</li>
                <li>点击"测试URL生成和解析"在新标签页中测试实际URL</li>
                <li>查看控制台日志获取详细的调试信息</li>
                <li>检查测试结果中的详情了解具体问题</li>
              </ol>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>注意:</strong> 此页面仅用于开发环境测试。生产环境中应移除此页面。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
