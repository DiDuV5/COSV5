# 自动清理服务 (Auto Cleanup Service)

## 📋 概述

自动清理服务是一个模块化的文件清理系统，用于自动清理临时文件、孤儿文件、日志文件等，防止磁盘空间浪费。该服务已从原来的单一大文件重构为多个模块化组件。

## 🏗️ 架构设计

### 核心组件

```
auto-cleanup/
├── types/                    # 类型定义
│   └── index.ts
├── strategies/               # 清理策略
│   └── cleanup-strategy.ts
├── utils/                    # 工具类
│   ├── file-lock-manager.ts
│   ├── file-scanner.ts
│   ├── report-manager.ts
│   ├── path-manager-mock.ts
│   └── prisma-mock.ts
├── tasks/                    # 清理任务
│   ├── base-cleanup-task.ts
│   └── cleanup-tasks.ts
├── __tests__/               # 测试文件
│   └── auto-cleanup-service.test.ts
├── index.ts                 # 统一导出
└── README.md               # 文档
```

### 主要类

1. **AutoCleanupService** - 主服务类，协调所有清理操作
2. **CleanupStrategyManager** - 策略管理器，管理清理配置
3. **FileLockManager** - 文件锁管理器，防止并发删除
4. **FileScanner** - 文件扫描器，扫描和分析文件
5. **ReportManager** - 报告管理器，管理清理报告
6. **CleanupTaskFactory** - 任务工厂，创建具体的清理任务

## 🚀 快速开始

### 基本使用

```typescript
import { AutoCleanupService } from '@/lib/storage/auto-cleanup';

// 获取服务实例
const cleanupService = AutoCleanupService.getInstance();

// 执行清理（模拟运行）
const report = await cleanupService.performFullCleanup(true);
console.log('清理报告:', report);

// 执行实际清理
const actualReport = await cleanupService.performFullCleanup(false);
```

### 自定义策略

```typescript
import { AutoCleanupService, CleanupStrategyManager } from '@/lib/storage/auto-cleanup';

// 创建自定义策略
const customStrategy = {
  chunkFiles: {
    maxAge: 48, // 48小时
    enabled: true,
  },
  orphanFiles: {
    maxAge: 72, // 72小时
    enabled: true,
    safetyCheck: true,
  },
};

// 应用策略
const service = AutoCleanupService.getInstance(customStrategy);

// 或者更新现有策略
service.updateStrategy(customStrategy);
```

### 文件锁管理

```typescript
import { FileLockManager } from '@/lib/storage/auto-cleanup';

const lockManager = FileLockManager.getInstance();

// 锁定文件
lockManager.lockFile('/path/to/file.txt');

// 检查文件是否被锁定
if (lockManager.isFileLocked('/path/to/file.txt')) {
  console.log('文件被锁定');
}

// 解锁文件
lockManager.unlockFile('/path/to/file.txt');
```

## 📝 清理任务类型

### 支持的任务类型

1. **chunkFiles** - 分片上传临时文件
2. **orphanFiles** - 孤儿文件（数据库中不存在的文件）
3. **logFiles** - 日志文件
4. **backupFiles** - 备份文件
5. **failedUploads** - 失败的上传文件
6. **tempProcessingFiles** - 临时处理文件

### 任务配置

```typescript
interface CleanupTaskConfig {
  name: string;           // 任务名称
  type: string;           // 任务类型
  enabled: boolean;       // 是否启用
  maxAge: number;         // 最大保留时间（毫秒）
  targetDir: string;      // 目标目录
  patterns?: string[];    // 文件模式匹配
  keepCount?: number;     // 保留文件数量
  safetyCheck?: boolean;  // 是否进行安全检查
}
```

## ⚙️ 配置选项

### 默认清理策略

```typescript
const DEFAULT_CLEANUP_STRATEGY = {
  chunkFiles: {
    maxAge: 24,        // 24小时
    enabled: true,
  },
  orphanFiles: {
    maxAge: 48,        // 48小时
    enabled: true,
    safetyCheck: true,
  },
  logFiles: {
    maxAge: 7,         // 7天
    enabled: true,
    keepCount: 10,
  },
  backupFiles: {
    maxAge: 30,        // 30天
    enabled: true,
    keepCount: 5,
  },
  failedUploads: {
    maxAge: 6,         // 6小时
    enabled: true,
  },
  tempProcessingFiles: {
    maxAge: 2,         // 2小时
    enabled: true,
  },
};
```

### 预设策略

- **conservative** - 保守策略，保留更长时间
- **aggressive** - 激进策略，更频繁清理
- **development** - 开发环境策略
- **production** - 生产环境策略

```typescript
import { CleanupStrategyManager, PRESET_STRATEGIES } from '@/lib/storage/auto-cleanup';

const manager = new CleanupStrategyManager();
manager.applyPreset('production');
```

## 📊 报告和监控

### 清理报告

```typescript
interface CleanupReport {
  totalFilesScanned: number;    // 总扫描文件数
  totalFilesDeleted: number;    // 总删除文件数
  totalSpaceFreed: number;      // 总释放空间
  taskResults: CleanupTaskResult[];  // 任务结果列表
  duration: number;             // 总执行时长
  timestamp: Date;              // 时间戳
  success: boolean;             // 是否成功
}
```

### 获取统计信息

```typescript
const service = AutoCleanupService.getInstance();

// 获取清理历史
const history = await service.getCleanupHistory(10);

// 获取统计信息
const stats = await service.getStatistics();
```

## 🧪 测试

### 运行测试

```bash
npm test src/lib/storage/auto-cleanup/__tests__/
```

### 测试覆盖

- 基础功能测试
- 策略管理测试
- 文件锁管理测试
- 文件扫描测试
- 任务工厂测试
- 报告管理测试

## 🔧 扩展开发

### 创建自定义清理任务

```typescript
import { BaseCleanupTask } from '@/lib/storage/auto-cleanup';

export class CustomCleanupTask extends BaseCleanupTask {
  public get name(): string {
    return '自定义清理任务';
  }

  public get type(): string {
    return 'customTask';
  }

  public getDescription(): string {
    return '执行自定义的清理逻辑';
  }

  protected async performCleanup(context, result) {
    // 实现自定义清理逻辑
    return [];
  }
}
```

### 注册自定义任务

```typescript
import { CleanupTaskFactory } from '@/lib/storage/auto-cleanup';

// 在任务工厂中注册新任务
CleanupTaskFactory.registerTask('customTask', CustomCleanupTask);
```

## 📚 API 参考

### 主要方法

- `performFullCleanup(dryRun?: boolean)` - 执行完整清理
- `updateStrategy(strategy: Partial<CleanupStrategy>)` - 更新清理策略
- `getStrategy()` - 获取当前策略
- `getStatus()` - 获取服务状态
- `lockFile(filePath: string)` - 锁定文件
- `unlockFile(filePath: string)` - 解锁文件

### 事件

服务继承自 EventEmitter，支持以下事件：

- `cleanupComplete` - 清理完成
- `error` - 清理错误

```typescript
service.on('cleanupComplete', (report) => {
  console.log('清理完成:', report);
});

service.on('error', (error) => {
  console.error('清理错误:', error);
});
```

## 🔒 安全考虑

1. **文件锁机制** - 防止并发删除
2. **安全检查** - 保护重要文件
3. **备份机制** - 删除前可选备份
4. **权限验证** - 确保有删除权限
5. **模拟运行** - 支持预览删除操作

## 📈 性能优化

1. **批量操作** - 批量处理文件
2. **异步处理** - 非阻塞操作
3. **内存管理** - 避免内存泄漏
4. **错误恢复** - 单个文件失败不影响整体
5. **进度监控** - 实时监控清理进度

## 🐛 故障排除

### 常见问题

1. **权限不足** - 确保有文件删除权限
2. **文件被占用** - 检查文件锁状态
3. **路径不存在** - 验证目录路径
4. **配置错误** - 检查策略配置

### 调试模式

```typescript
// 启用详细日志
const service = AutoCleanupService.getInstance();
service.on('debug', console.log);

// 模拟运行查看效果
const report = await service.performFullCleanup(true);
```

## 📄 许可证

本项目遵循 MIT 许可证。
