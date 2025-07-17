/**
 * @fileoverview 自动清理服务测试
 * @description 测试重构后的自动清理服务功能
 */

import { AutoCleanupService } from '../../auto-cleanup-service';
import { CleanupStrategyManager, DEFAULT_CLEANUP_STRATEGY } from '../strategies/cleanup-strategy';
import { FileLockManager } from '../utils/file-lock-manager';
import { FileScanner } from '../utils/file-scanner';
import { ReportManager } from '../utils/report-manager';
import { CleanupTaskFactory } from '../tasks/cleanup-tasks';

describe('AutoCleanupService', () => {
  let service: AutoCleanupService;

  beforeEach(() => {
    service = AutoCleanupService.getInstance();
  });

  describe('基础功能', () => {
    test('应该能够获取单例实例', () => {
      const instance1 = AutoCleanupService.getInstance();
      const instance2 = AutoCleanupService.getInstance();
      expect(instance1).toBe(instance2);
    });

    test('应该能够获取当前策略', () => {
      const strategy = service.getStrategy();
      expect(strategy).toBeDefined();
      expect(strategy.chunkFiles).toBeDefined();
      expect(strategy.orphanFiles).toBeDefined();
    });

    test('应该能够更新策略', () => {
      const newStrategy = {
        chunkFiles: {
          maxAge: 48,
          enabled: false,
        },
      };

      service.updateStrategy(newStrategy);
      const updatedStrategy = service.getStrategy();
      expect(updatedStrategy.chunkFiles.maxAge).toBe(48);
      expect(updatedStrategy.chunkFiles.enabled).toBe(false);
    });

    test('应该能够获取服务状态', () => {
      const status = service.getStatus();
      expect(status).toBeDefined();
      expect(status.isRunning).toBe(false);
      expect(status.strategy).toBeDefined();
      expect(status.lockedFiles).toEqual([]);
    });
  });

  describe('文件锁管理', () => {
    test('应该能够锁定和解锁文件', () => {
      const filePath = '/test/file.txt';

      service.lockFile(filePath);
      const status = service.getStatus();
      expect(status.lockedFiles).toContain(filePath);

      service.unlockFile(filePath);
      const updatedStatus = service.getStatus();
      expect(updatedStatus.lockedFiles).not.toContain(filePath);
    });
  });

  describe('清理执行', () => {
    test('应该能够执行模拟清理', async () => {
      const report = await service.performFullCleanup(true); // 模拟运行

      expect(report).toBeDefined();
      expect(report.success).toBe(true);
      expect(report.totalFilesScanned).toBeGreaterThanOrEqual(0);
      expect(report.totalFilesDeleted).toBeGreaterThanOrEqual(0);
      expect(report.taskResults).toBeInstanceOf(Array);
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    test('应该防止并发执行', async () => {
      // 启动第一个清理任务
      const promise1 = service.performFullCleanup(true);

      // 尝试启动第二个清理任务
      await expect(service.performFullCleanup(true)).rejects.toThrow('清理任务正在运行中');

      // 等待第一个任务完成
      await promise1;
    });
  });
});

describe('CleanupStrategyManager', () => {
  let manager: CleanupStrategyManager;

  beforeEach(() => {
    manager = new CleanupStrategyManager();
  });

  test('应该使用默认策略', () => {
    const strategy = manager.getStrategy();
    expect(strategy.chunkFiles.maxAge).toBe(DEFAULT_CLEANUP_STRATEGY.chunkFiles.maxAge);
  });

  test('应该能够验证策略', () => {
    const validStrategy = { chunkFiles: { maxAge: 24, enabled: true } };
    const result = manager.validateStrategy(validStrategy);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('应该检测无效策略', () => {
    const invalidStrategy = { chunkFiles: { maxAge: -1, enabled: true } };
    const result = manager.validateStrategy(invalidStrategy);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('应该获取启用的任务配置', () => {
    const configs = manager.getEnabledTaskConfigs();
    expect(configs).toBeInstanceOf(Array);
    expect(configs.length).toBeGreaterThan(0);
    configs.forEach(config => {
      expect(config.enabled).toBe(true);
    });
  });
});

describe('FileLockManager', () => {
  let lockManager: FileLockManager;

  beforeEach(() => {
    lockManager = FileLockManager.getInstance();
    // 清理所有锁
    lockManager.clearAllLocks();
  });

  test('应该能够锁定文件', () => {
    const filePath = '/test/file.txt';
    lockManager.lockFile(filePath);
    expect(lockManager.isFileLocked(filePath)).toBe(true);
  });

  test('应该能够解锁文件', () => {
    const filePath = '/test/file.txt';
    lockManager.lockFile(filePath);
    lockManager.unlockFile(filePath);
    expect(lockManager.isFileLocked(filePath)).toBe(false);
  });

  test('应该获取锁定的文件列表', () => {
    const files = ['/test/file1.txt', '/test/file2.txt'];
    files.forEach(file => lockManager.lockFile(file));

    const lockedFiles = lockManager.getLockedFiles();
    expect(lockedFiles).toHaveLength(2);
    files.forEach(file => {
      expect(lockedFiles).toContain(file.toLowerCase());
    });
  });

  test('应该清理过期的锁', () => {
    const filePath = '/test/file.txt';
    lockManager.lockFile(filePath);

    // 模拟过期锁（通过设置较短的超时时间）
    lockManager.setLockTimeout(1); // 1毫秒

    setTimeout(() => {
      lockManager.cleanupExpiredLocks();
      expect(lockManager.isFileLocked(filePath)).toBe(false);
    }, 10);
  });
});

describe('FileScanner', () => {
  let scanner: FileScanner;

  beforeEach(() => {
    scanner = FileScanner.getInstance();
  });

  test('应该能够检测文件类型', () => {
    expect(scanner.detectFileType('/chunks/file.chunk')).toBe('chunk');
    expect(scanner.detectFileType('/logs/app.log')).toBe('log');
    expect(scanner.detectFileType('/backup/data.backup')).toBe('backup');
    expect(scanner.detectFileType('/temp/processing_file.tmp')).toBe('temp_processing');
    expect(scanner.detectFileType('/temp/upload_failed.txt')).toBe('failed_upload');
    expect(scanner.detectFileType('/unknown/file.txt')).toBe('unknown');
  });

  test('应该能够检查临时处理文件', () => {
    expect(scanner.isTempProcessingFile('temp_file.txt')).toBe(true);
    expect(scanner.isTempProcessingFile('processing_video.mp4')).toBe(true);
    expect(scanner.isTempProcessingFile('transcode_output.tmp')).toBe(true);
    expect(scanner.isTempProcessingFile('normal_file.txt')).toBe(false);
  });

  test('应该能够检查文件安全性', () => {
    expect(scanner.isSafeToDelete('/temp/file.txt')).toBe(true);
    expect(scanner.isSafeToDelete('/temp/.hidden')).toBe(false);
    expect(scanner.isSafeToDelete('/temp/package.json')).toBe(false);
    expect(scanner.isSafeToDelete('/temp/README.md')).toBe(false);
  });

  test('应该能够格式化文件大小', () => {
    expect(scanner.formatFileSize(0)).toBe('0 Bytes');
    expect(scanner.formatFileSize(1024)).toBe('1 KB');
    expect(scanner.formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(scanner.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });
});

describe('CleanupTaskFactory', () => {
  test('应该能够创建不同类型的清理任务', () => {
    const config = {
      name: 'test',
      type: 'chunkFiles',
      enabled: true,
      maxAge: 24 * 60 * 60 * 1000,
      targetDir: 'chunks',
    };

    const task = CleanupTaskFactory.createTask(config);
    expect(task).toBeDefined();
    expect(task?.name).toBe('分片文件清理');
    expect(task?.type).toBe('chunkFiles');
  });

  test('应该返回null对于未知任务类型', () => {
    const config = {
      name: 'test',
      type: 'unknownType',
      enabled: true,
      maxAge: 24 * 60 * 60 * 1000,
      targetDir: 'unknown',
    };

    const task = CleanupTaskFactory.createTask(config);
    expect(task).toBeNull();
  });

  test('应该获取支持的任务类型', () => {
    const types = CleanupTaskFactory.getSupportedTaskTypes();
    expect(types).toContain('chunkFiles');
    expect(types).toContain('orphanFiles');
    expect(types).toContain('logFiles');
    expect(types).toContain('backupFiles');
    expect(types).toContain('failedUploads');
    expect(types).toContain('tempProcessingFiles');
  });
});

describe('ReportManager', () => {
  let reportManager: ReportManager;

  beforeEach(() => {
    reportManager = ReportManager.getInstance();
  });

  test('应该能够生成报告摘要', () => {
    const report = {
      totalFilesScanned: 100,
      totalFilesDeleted: 10,
      totalSpaceFreed: 1024 * 1024, // 1MB
      taskResults: [
        {
          taskType: 'chunkFiles',
          success: true,
          filesScanned: 50,
          filesDeleted: 5,
          spaceFreed: 512 * 1024,
          errors: [],
          duration: 2500,
          timestamp: new Date()
        },
        {
          taskType: 'logFiles',
          success: true,
          filesScanned: 50,
          filesDeleted: 5,
          spaceFreed: 512 * 1024,
          errors: [],
          duration: 2500,
          timestamp: new Date()
        },
      ],
      duration: 5000,
      timestamp: new Date(),
      success: true,
    };

    const summary = reportManager.generateSummary(report);
    expect(summary).toContain('100');
    expect(summary).toContain('10');
    expect(summary).toContain('1 MB');
    expect(summary).toContain('成功');
  });
});
