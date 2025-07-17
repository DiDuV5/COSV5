/**
 * @fileoverview Redis配置验证工具
 * @description 验证和诊断Redis配置问题
 */

interface RedisConfigValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  config: {
    host: string;
    port: number;
    password?: string;
    username?: string;
    database: number;
    url?: string;
  };
}

/**
 * 验证Redis配置
 */
export function validateRedisConfig(): RedisConfigValidation {
  const warnings: string[] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];

  // 获取环境变量
  const redisUrl = process.env.COSEREEDEN_REDIS_URL;
  const redisHost = process.env.COSEREEDEN_REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.COSEREEDEN_REDIS_PORT || '6379');
  const redisPassword = process.env.COSEREEDEN_REDIS_PASSWORD;
  const redisUsername = process.env.COSEREEDEN_REDIS_USERNAME;
  const redisDb = parseInt(process.env.COSEREEDEN_REDIS_DB || '0');

  // 解析Redis URL
  const parsedConfig = {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    username: redisUsername,
    database: redisDb,
    url: redisUrl,
  };

  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      parsedConfig.host = url.hostname;
      parsedConfig.port = parseInt(url.port) || 6379;

      // 检查URL中的认证信息
      if (url.password) {
        parsedConfig.password = url.password;
        if (!url.password.trim()) {
          warnings.push('Redis URL中包含空密码');
        }
      }

      if (url.username) {
        parsedConfig.username = url.username;
      }

      // 检查数据库
      const pathname = url.pathname.slice(1);
      if (pathname) {
        parsedConfig.database = parseInt(pathname) || 0;
      }
    } catch (error) {
      errors.push(`Redis URL格式无效: ${redisUrl}`);
    }
  }

  // 验证主机和端口
  if (!parsedConfig.host) {
    errors.push('Redis主机地址未配置');
  }

  if (parsedConfig.port < 1 || parsedConfig.port > 65535) {
    errors.push(`Redis端口无效: ${parsedConfig.port}`);
  }

  // 检查密码配置
  if (parsedConfig.password) {
    if (parsedConfig.password.trim() === '') {
      warnings.push('Redis密码为空字符串，可能导致认证警告');
      recommendations.push('如果Redis服务器不需要密码，请移除REDIS_PASSWORD环境变量');
    } else if (parsedConfig.password.length < 8) {
      warnings.push('Redis密码长度较短，建议使用更强的密码');
    }
  }

  // 检查数据库索引
  if (parsedConfig.database < 0 || parsedConfig.database > 15) {
    warnings.push(`Redis数据库索引可能无效: ${parsedConfig.database}`);
  }

  // 环境特定的建议
  if (process.env.NODE_ENV === 'production') {
    if (!parsedConfig.password) {
      warnings.push('生产环境建议设置Redis密码');
    }

    if (parsedConfig.host === 'localhost' || parsedConfig.host === '127.0.0.1') {
      warnings.push('生产环境使用localhost可能存在安全风险');
    }
  }

  // 性能建议
  if (parsedConfig.port === 6379) {
    recommendations.push('考虑使用非默认端口提高安全性');
  }

  // 连接字符串建议
  if (redisUrl && (redisHost !== 'localhost' || redisPort !== 6379)) {
    warnings.push('同时设置了REDIS_URL和单独的Redis配置，REDIS_URL将优先使用');
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    warnings,
    errors,
    recommendations,
    config: parsedConfig,
  };
}

/**
 * 格式化配置验证结果
 */
export function formatConfigValidation(validation: RedisConfigValidation): string {
  let result = `Redis配置验证结果:\n`;
  result += `状态: ${validation.isValid ? '✅ 有效' : '❌ 无效'}\n`;
  result += `连接: ${validation.config.host}:${validation.config.port}/${validation.config.database}\n`;

  if (validation.config.password) {
    result += `认证: 已配置密码\n`;
  } else {
    result += `认证: 无密码\n`;
  }

  if (validation.errors.length > 0) {
    result += `\n❌ 错误:\n`;
    validation.errors.forEach(error => {
      result += `  - ${error}\n`;
    });
  }

  if (validation.warnings.length > 0) {
    result += `\n⚠️ 警告:\n`;
    validation.warnings.forEach(warning => {
      result += `  - ${warning}\n`;
    });
  }

  if (validation.recommendations.length > 0) {
    result += `\n💡 建议:\n`;
    validation.recommendations.forEach(rec => {
      result += `  - ${rec}\n`;
    });
  }

  return result;
}

/**
 * 生成推荐的Redis配置
 */
export function generateRecommendedConfig(currentConfig?: any): {
  envVars: Record<string, string>;
  explanation: string;
} {
  const isProduction = process.env.NODE_ENV === 'production';
  const currentHost = currentConfig?.host || 'localhost';
  const currentPort = currentConfig?.port || 6379;

  const envVars: Record<string, string> = {};
  let explanation = 'Redis配置建议:\n\n';

  // 基础连接配置
  if (isProduction) {
    envVars.REDIS_URL = `redis://${currentHost}:${currentPort}`;
    explanation += '生产环境使用REDIS_URL统一配置\n';
  } else {
    envVars.REDIS_HOST = currentHost;
    envVars.REDIS_PORT = currentPort.toString();
    envVars.REDIS_DB = '0';
    explanation += '开发环境使用分离的配置项\n';
  }

  // 安全配置
  if (isProduction) {
    explanation += '生产环境建议:\n';
    explanation += '- 设置强密码: REDIS_PASSWORD=your_strong_password\n';
    explanation += '- 启用TLS: REDIS_TLS_ENABLED=true\n';
    explanation += '- 限制访问IP: REDIS_ALLOWED_IPS=your_server_ip\n';
  } else {
    explanation += '开发环境建议:\n';
    explanation += '- 如果本地Redis无密码，不要设置REDIS_PASSWORD\n';
    explanation += '- 使用默认配置即可\n';
  }

  // 性能配置
  explanation += '\n性能优化:\n';
  explanation += '- 连接池大小: REDIS_MAX_CONNECTIONS=50\n';
  explanation += '- 连接超时: REDIS_CONNECT_TIMEOUT=5000\n';
  explanation += '- 命令超时: REDIS_COMMAND_TIMEOUT=3000\n';

  return { envVars, explanation };
}

/**
 * 检查Redis配置兼容性
 */
export async function checkRedisCompatibility(): Promise<{
  compatible: boolean;
  version?: string;
  features: {
    streams: boolean;
    modules: boolean;
    acl: boolean;
    tls: boolean;
  };
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();

    // 获取Redis版本信息
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    // 检查功能支持
    const features = {
      streams: await checkFeatureSupport(redis, 'XADD test-stream * field value'),
      modules: await checkFeatureSupport(redis, 'MODULE LIST'),
      acl: await checkFeatureSupport(redis, 'ACL LIST'),
      tls: false, // TLS需要特殊检查
    };

    // 清理测试数据
    try {
      await redis.del('test-stream');
    } catch {
      // 忽略清理错误
    }

    // 版本兼容性检查
    const [major, minor] = version.split('.').map(Number);
    if (major < 5) {
      issues.push(`Redis版本过低 (${version})，建议升级到5.0+`);
    }

    if (!features.streams && major >= 5) {
      issues.push('Redis Streams功能不可用');
    }

    const compatible = issues.length === 0;

    return {
      compatible,
      version,
      features,
      issues,
    };
  } catch (error) {
    return {
      compatible: false,
      features: {
        streams: false,
        modules: false,
        acl: false,
        tls: false,
      },
      issues: [`无法连接到Redis: ${error instanceof Error ? error.message : '未知错误'}`],
    };
  }
}

/**
 * 检查特定功能支持
 */
async function checkFeatureSupport(redis: any, command: string): Promise<boolean> {
  try {
    await redis.call(...command.split(' '));
    return true;
  } catch {
    return false;
  }
}
