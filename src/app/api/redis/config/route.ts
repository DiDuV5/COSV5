/**
 * @fileoverview Redis配置诊断API端点
 * @description 提供Redis配置验证和诊断功能
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateRedisConfig,
  formatConfigValidation,
  generateRecommendedConfig,
  checkRedisCompatibility
} from '@/lib/utils/redis-config-validator';

export async function GET(request: NextRequest) {
  try {
    // 检查权限（这里简化处理，实际应该检查管理员权限）
    const authHeader = request.headers.get('authorization');
    if (!authHeader && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'validate';

    switch (action) {
      case 'validate': {
        // 验证当前配置
        const validation = validateRedisConfig();

        return NextResponse.json({
          success: true,
          data: {
            validation,
            summary: formatConfigValidation(validation),
            timestamp: new Date().toISOString(),
          },
          message: validation.isValid ? 'Redis配置有效' : 'Redis配置存在问题',
        });
      }

      case 'recommend': {
        // 生成推荐配置
        const validation = validateRedisConfig();
        const recommended = generateRecommendedConfig(validation.config);

        return NextResponse.json({
          success: true,
          data: {
            current: validation.config,
            recommended: recommended.envVars,
            explanation: recommended.explanation,
            timestamp: new Date().toISOString(),
          },
          message: '配置建议生成成功',
        });
      }

      case 'compatibility': {
        // 检查兼容性
        const compatibility = await checkRedisCompatibility();

        return NextResponse.json({
          success: true,
          data: {
            compatibility,
            timestamp: new Date().toISOString(),
          },
          message: compatibility.compatible ? 'Redis兼容性良好' : 'Redis兼容性存在问题',
        });
      }

      default:
        return NextResponse.json(
          { error: '不支持的操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Redis配置诊断失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Redis配置诊断失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * 更新Redis配置
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config } = body;

    if (action === 'test-config') {
      // 测试指定配置
      const testResult = await testRedisConfig(config);

      return NextResponse.json({
        success: true,
        data: {
          testResult,
          timestamp: new Date().toISOString(),
        },
        message: testResult.success ? '配置测试成功' : '配置测试失败',
      });
    }

    if (action === 'apply-recommendations') {
      // 应用推荐配置（仅返回建议，不实际修改）
      const validation = validateRedisConfig();
      const recommended = generateRecommendedConfig(validation.config);

      return NextResponse.json({
        success: true,
        data: {
          instructions: generateApplyInstructions(recommended),
          timestamp: new Date().toISOString(),
        },
        message: '配置应用说明生成成功',
      });
    }

    return NextResponse.json(
      { error: '不支持的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Redis配置操作失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Redis配置操作失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

/**
 * 测试Redis配置
 */
async function testRedisConfig(config: any) {
  try {
    const Redis = (await import('ioredis')).default;

    // 创建测试连接
    const testRedis = new Redis({
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password || undefined,
      username: config.username || undefined,
      db: config.database || 0,
      connectTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    const startTime = Date.now();

    // 测试连接
    await testRedis.ping();
    const latency = Date.now() - startTime;

    // 测试基本操作
    const testKey = `config_test_${Date.now()}`;
    await testRedis.set(testKey, 'test_value', 'EX', 10);
    const value = await testRedis.get(testKey);
    await testRedis.del(testKey);

    // 关闭测试连接
    testRedis.disconnect();

    return {
      success: true,
      latency,
      operations: {
        ping: true,
        set: true,
        get: value === 'test_value',
        del: true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 生成配置应用说明
 */
function generateApplyInstructions(recommended: any): string {
  let instructions = '应用Redis配置建议:\n\n';

  instructions += '1. 更新环境变量文件 (.env.local):\n';
  Object.entries(recommended.envVars).forEach(([key, value]) => {
    instructions += `   ${key}="${value}"\n`;
  });

  instructions += '\n2. 重启应用程序:\n';
  instructions += '   npm run dev  # 开发环境\n';
  instructions += '   # 或重启生产服务\n';

  instructions += '\n3. 验证配置:\n';
  instructions += '   访问 /api/redis/config?action=validate 检查配置\n';
  instructions += '   访问 /api/redis/health 检查连接状态\n';

  instructions += '\n4. 注意事项:\n';
  instructions += '   - 备份当前配置文件\n';
  instructions += '   - 确保Redis服务器配置匹配\n';
  instructions += '   - 在生产环境中谨慎应用更改\n';

  instructions += `\n5. 详细说明:\n${recommended.explanation}`;

  return instructions;
}
