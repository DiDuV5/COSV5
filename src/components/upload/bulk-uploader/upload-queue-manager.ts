/**
 * @fileoverview 上传队列管理器
 * @description 处理批量上传的队列管理和并发控制，从原 OptimizedBulkUploader.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'paused' | 'cancelled';

export interface UploadFileItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  result?: any;
  thumbnail?: string;
  startTime?: number;
  endTime?: number;
  retryCount?: number;
}

export interface UploadQueueOptions {
  concurrency: number;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

export interface UploadProgress {
  completed: number;
  failed: number;
  uploading: number;
  pending: number;
  total: number;
  overallProgress: number;
  uploadSpeed: number;
  estimatedTimeRemaining: number;
}

/**
 * 上传队列管理器类
 * 负责管理文件上传队列、并发控制和进度跟踪
 */
export class UploadQueueManager {
  private files: Map<string, UploadFileItem> = new Map();
  private uploadQueue: string[] = [];
  private activeUploads: Set<string> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private options: UploadQueueOptions;
  private isPaused: boolean = false;
  private startTime?: number;

  // 事件回调
  private onProgressCallback?: (progress: UploadProgress) => void;
  private onFileStatusChangeCallback?: (fileId: string, status: UploadStatus) => void;
  private onCompleteCallback?: (results: any[]) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(options: Partial<UploadQueueOptions> = {}) {
    this.options = {
      concurrency: 5,
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...options
    };
  }

  /**
   * 添加文件到队列
   */
  public addFiles(files: UploadFileItem[]): void {
    files.forEach(file => {
      this.files.set(file.id, file);
      if (file.status === 'pending') {
        this.uploadQueue.push(file.id);
      }
    });
    this.notifyProgress();
  }

  /**
   * 移除文件
   */
  public removeFile(fileId: string): void {
    // 取消正在进行的上传
    this.cancelUpload(fileId);
    
    // 从队列中移除
    this.uploadQueue = this.uploadQueue.filter(id => id !== fileId);
    this.files.delete(fileId);
    
    this.notifyProgress();
  }

  /**
   * 清空所有文件
   */
  public clearAll(): void {
    // 取消所有上传
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    
    // 清空数据
    this.files.clear();
    this.uploadQueue = [];
    this.activeUploads.clear();
    this.isPaused = false;
    
    this.notifyProgress();
  }

  /**
   * 开始上传
   */
  public async startUpload(uploadFunction: (file: UploadFileItem) => Promise<any>): Promise<void> {
    if (this.uploadQueue.length === 0) return;

    this.isPaused = false;
    this.startTime = Date.now();

    // 启动初始并发上传
    const initialBatch = this.uploadQueue.splice(0, this.options.concurrency);
    const uploadPromises = initialBatch.map(fileId => 
      this.uploadFile(fileId, uploadFunction)
    );

    try {
      await Promise.all(uploadPromises);
      
      // 收集结果
      const results = Array.from(this.files.values())
        .filter(file => file.status === 'completed')
        .map(file => file.result);
      
      this.onCompleteCallback?.(results);
    } catch (error) {
      this.onErrorCallback?.(error as Error);
    }
  }

  /**
   * 暂停上传
   */
  public pauseUpload(): void {
    this.isPaused = true;
    
    // 暂停所有正在上传的文件
    this.activeUploads.forEach(fileId => {
      const file = this.files.get(fileId);
      if (file && file.status === 'uploading') {
        file.status = 'paused';
        this.notifyFileStatusChange(fileId, 'paused');
      }
    });
    
    this.notifyProgress();
  }

  /**
   * 恢复上传
   */
  public async resumeUpload(uploadFunction: (file: UploadFileItem) => Promise<any>): Promise<void> {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    
    // 将暂停的文件重新加入队列
    const pausedFiles = Array.from(this.files.values())
      .filter(file => file.status === 'paused')
      .map(file => file.id);
    
    this.uploadQueue.unshift(...pausedFiles);
    
    // 重新开始上传
    await this.startUpload(uploadFunction);
  }

  /**
   * 取消单个文件上传
   */
  public cancelUpload(fileId: string): void {
    const controller = this.abortControllers.get(fileId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(fileId);
    }
    
    this.activeUploads.delete(fileId);
    
    const file = this.files.get(fileId);
    if (file) {
      file.status = 'cancelled';
      this.notifyFileStatusChange(fileId, 'cancelled');
    }
  }

  /**
   * 重试失败的文件
   */
  public async retryFailedFiles(uploadFunction: (file: UploadFileItem) => Promise<any>): Promise<void> {
    const failedFiles = Array.from(this.files.values())
      .filter(file => file.status === 'error')
      .map(file => {
        file.status = 'pending';
        file.progress = 0;
        file.error = undefined;
        file.retryCount = (file.retryCount || 0) + 1;
        return file.id;
      });
    
    this.uploadQueue.unshift(...failedFiles);
    await this.startUpload(uploadFunction);
  }

  /**
   * 上传单个文件
   */
  private async uploadFile(fileId: string, uploadFunction: (file: UploadFileItem) => Promise<any>): Promise<void> {
    const file = this.files.get(fileId);
    if (!file || this.isPaused) return;

    this.activeUploads.add(fileId);
    file.status = 'uploading';
    file.startTime = Date.now();
    this.notifyFileStatusChange(fileId, 'uploading');

    const controller = new AbortController();
    this.abortControllers.set(fileId, controller);

    try {
      // 设置超时
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.options.timeout);

      // 执行上传
      const result = await uploadFunction(file);
      
      clearTimeout(timeoutId);
      
      // 上传成功
      file.status = 'completed';
      file.progress = 100;
      file.result = result;
      file.endTime = Date.now();
      
      this.notifyFileStatusChange(fileId, 'completed');
      
    } catch (error) {
      // 上传失败
      const retryCount = file.retryCount || 0;
      
      if (retryCount < this.options.maxRetries && !controller.signal.aborted) {
        // 重试
        file.retryCount = retryCount + 1;
        file.status = 'pending';
        file.progress = 0;
        
        // 延迟后重新加入队列
        setTimeout(() => {
          this.uploadQueue.unshift(fileId);
          this.processNext(uploadFunction);
        }, this.options.retryDelay * (retryCount + 1));
        
      } else {
        // 标记为失败
        file.status = 'error';
        file.error = error instanceof Error ? error.message : '上传失败';
        file.endTime = Date.now();
        
        this.notifyFileStatusChange(fileId, 'error');
      }
    } finally {
      this.abortControllers.delete(fileId);
      this.activeUploads.delete(fileId);
      this.notifyProgress();
      
      // 处理下一个文件
      this.processNext(uploadFunction);
    }
  }

  /**
   * 处理队列中的下一个文件
   */
  private async processNext(uploadFunction: (file: UploadFileItem) => Promise<any>): Promise<void> {
    if (this.isPaused || this.uploadQueue.length === 0) return;
    
    const nextFileId = this.uploadQueue.shift();
    if (nextFileId) {
      await this.uploadFile(nextFileId, uploadFunction);
    }
  }

  /**
   * 更新文件进度
   */
  public updateFileProgress(fileId: string, progress: number): void {
    const file = this.files.get(fileId);
    if (file) {
      file.progress = Math.min(100, Math.max(0, progress));
      this.notifyProgress();
    }
  }

  /**
   * 获取上传进度
   */
  public getProgress(): UploadProgress {
    const files = Array.from(this.files.values());
    const completed = files.filter(f => f.status === 'completed').length;
    const failed = files.filter(f => f.status === 'error').length;
    const uploading = files.filter(f => f.status === 'uploading' || f.status === 'processing').length;
    const pending = files.filter(f => f.status === 'pending').length;
    const total = files.length;
    
    const totalProgress = files.reduce((sum, file) => sum + file.progress, 0);
    const overallProgress = total > 0 ? Math.round(totalProgress / total) : 0;
    
    // 计算上传速度和预估时间
    const { uploadSpeed, estimatedTimeRemaining } = this.calculateSpeedAndTime(files);
    
    return {
      completed,
      failed,
      uploading,
      pending,
      total,
      overallProgress,
      uploadSpeed,
      estimatedTimeRemaining
    };
  }

  /**
   * 计算上传速度和预估时间
   */
  private calculateSpeedAndTime(files: UploadFileItem[]): { uploadSpeed: number; estimatedTimeRemaining: number } {
    if (!this.startTime) return { uploadSpeed: 0, estimatedTimeRemaining: 0 };
    
    const now = Date.now();
    const elapsedTime = (now - this.startTime) / 1000; // 秒
    
    const completedFiles = files.filter(f => f.status === 'completed');
    const totalCompletedSize = completedFiles.reduce((sum, file) => sum + file.file.size, 0);
    
    const uploadSpeed = elapsedTime > 0 ? totalCompletedSize / elapsedTime : 0; // 字节/秒
    
    const remainingFiles = files.filter(f => f.status !== 'completed' && f.status !== 'error');
    const remainingSize = remainingFiles.reduce((sum, file) => sum + file.file.size, 0);
    
    const estimatedTimeRemaining = uploadSpeed > 0 ? remainingSize / uploadSpeed : 0;
    
    return { uploadSpeed, estimatedTimeRemaining };
  }

  /**
   * 设置事件回调
   */
  public setCallbacks(callbacks: {
    onProgress?: (progress: UploadProgress) => void;
    onFileStatusChange?: (fileId: string, status: UploadStatus) => void;
    onComplete?: (results: any[]) => void;
    onError?: (error: Error) => void;
  }): void {
    this.onProgressCallback = callbacks.onProgress;
    this.onFileStatusChangeCallback = callbacks.onFileStatusChange;
    this.onCompleteCallback = callbacks.onComplete;
    this.onErrorCallback = callbacks.onError;
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(): void {
    this.onProgressCallback?.(this.getProgress());
  }

  /**
   * 通知文件状态变化
   */
  private notifyFileStatusChange(fileId: string, status: UploadStatus): void {
    this.onFileStatusChangeCallback?.(fileId, status);
  }

  /**
   * 获取所有文件
   */
  public getFiles(): UploadFileItem[] {
    return Array.from(this.files.values());
  }

  /**
   * 获取特定状态的文件
   */
  public getFilesByStatus(status: UploadStatus): UploadFileItem[] {
    return Array.from(this.files.values()).filter(file => file.status === status);
  }

  /**
   * 更新队列选项
   */
  public updateOptions(newOptions: Partial<UploadQueueOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }
}

/**
 * 创建上传队列管理器实例
 */
export function createUploadQueueManager(options?: Partial<UploadQueueOptions>): UploadQueueManager {
  return new UploadQueueManager(options);
}

/**
 * 导出上传队列管理器
 */
export default UploadQueueManager;
