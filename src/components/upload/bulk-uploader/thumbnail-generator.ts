/**
 * @fileoverview 缩略图生成器
 * @description 处理文件缩略图生成功能，从原 OptimizedBulkUploader.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

export interface ThumbnailOptions {
  width: number;
  height: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

export interface ThumbnailResult {
  dataUrl: string;
  width: number;
  height: number;
  size: number;
}

/**
 * 缩略图生成器类
 * 负责为图片和视频文件生成缩略图
 */
export class ThumbnailGenerator {
  private defaultOptions: ThumbnailOptions = {
    width: 150,
    height: 150,
    quality: 0.8,
    format: 'jpeg'
  };

  /**
   * 为文件生成缩略图
   */
  public async generateThumbnail(
    file: File, 
    options?: Partial<ThumbnailOptions>
  ): Promise<ThumbnailResult | null> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (file.type.startsWith('image/')) {
        return await this.generateImageThumbnail(file, opts);
      } else if (file.type.startsWith('video/')) {
        return await this.generateVideoThumbnail(file, opts);
      }
      return null;
    } catch (error) {
      console.error('生成缩略图失败:', error);
      return null;
    }
  }

  /**
   * 生成图片缩略图
   */
  private async generateImageThumbnail(
    file: File, 
    options: ThumbnailOptions
  ): Promise<ThumbnailResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          try {
            const result = this.resizeImage(img, options);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 生成视频缩略图
   */
  private async generateVideoThumbnail(
    file: File, 
    options: ThumbnailOptions
  ): Promise<ThumbnailResult> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }

      video.onloadedmetadata = () => {
        // 设置视频时间到第一秒或10%处
        video.currentTime = Math.min(1, video.duration * 0.1);
      };

      video.onseeked = () => {
        try {
          // 计算缩略图尺寸
          const { width, height } = this.calculateDimensions(
            video.videoWidth,
            video.videoHeight,
            options.width,
            options.height
          );

          canvas.width = width;
          canvas.height = height;

          // 绘制视频帧
          ctx.drawImage(video, 0, 0, width, height);

          // 转换为数据URL
          const dataUrl = canvas.toDataURL(`image/${options.format}`, options.quality);
          const size = this.estimateDataUrlSize(dataUrl);

          resolve({
            dataUrl,
            width,
            height,
            size
          });

          // 清理资源
          video.src = '';
          URL.revokeObjectURL(video.src);
        } catch (error) {
          reject(error);
        }
      };

      video.onerror = () => reject(new Error('视频加载失败'));
      
      // 设置视频源
      video.src = URL.createObjectURL(file);
      video.load();
    });
  }

  /**
   * 调整图片大小
   */
  private resizeImage(img: HTMLImageElement, options: ThumbnailOptions): ThumbnailResult {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('无法创建Canvas上下文');
    }

    // 计算缩略图尺寸
    const { width, height } = this.calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      options.width,
      options.height
    );

    canvas.width = width;
    canvas.height = height;

    // 设置高质量缩放
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 绘制图片
    ctx.drawImage(img, 0, 0, width, height);

    // 转换为数据URL
    const dataUrl = canvas.toDataURL(`image/${options.format}`, options.quality);
    const size = this.estimateDataUrlSize(dataUrl);

    return {
      dataUrl,
      width,
      height,
      size
    };
  }

  /**
   * 计算缩略图尺寸（保持宽高比）
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // 计算缩放比例
    const widthRatio = maxWidth / originalWidth;
    const heightRatio = maxHeight / originalHeight;
    const ratio = Math.min(widthRatio, heightRatio);

    // 如果需要缩放
    if (ratio < 1) {
      width = Math.round(originalWidth * ratio);
      height = Math.round(originalHeight * ratio);
    }

    return { width, height };
  }

  /**
   * 估算数据URL的大小
   */
  private estimateDataUrlSize(dataUrl: string): number {
    // Base64编码大约增加33%的大小
    const base64Data = dataUrl.split(',')[1];
    return Math.round((base64Data.length * 3) / 4);
  }

  /**
   * 批量生成缩略图
   */
  public async generateBatchThumbnails(
    files: File[],
    options?: Partial<ThumbnailOptions>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, ThumbnailResult | null>> {
    const results = new Map<string, ThumbnailResult | null>();
    let completed = 0;

    // 并发生成缩略图（限制并发数）
    const concurrency = 3;
    const chunks = this.chunkArray(files, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async (file) => {
        const result = await this.generateThumbnail(file, options);
        results.set(file.name, result);
        completed++;
        onProgress?.(completed, files.length);
        return result;
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * 将数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 检查是否支持生成缩略图
   */
  public canGenerateThumbnail(file: File): boolean {
    return file.type.startsWith('image/') || file.type.startsWith('video/');
  }

  /**
   * 获取文件的默认图标
   */
  public getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) {
      return '🖼️';
    } else if (file.type.startsWith('video/')) {
      return '🎬';
    } else if (file.type.startsWith('audio/')) {
      return '🎵';
    } else if (file.type.includes('pdf')) {
      return '📄';
    } else if (file.type.includes('zip') || file.type.includes('rar')) {
      return '📦';
    } else {
      return '📁';
    }
  }

  /**
   * 清理缩略图缓存
   */
  public clearThumbnailCache(): void {
    // 这里可以实现缓存清理逻辑
    // 例如清理localStorage中的缓存数据
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('thumbnail_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('清理缩略图缓存失败:', error);
    }
  }

  /**
   * 缓存缩略图到本地存储
   */
  public cacheThumbnail(fileId: string, thumbnail: ThumbnailResult): void {
    try {
      const cacheKey = `thumbnail_cache_${fileId}`;
      const cacheData = {
        thumbnail,
        timestamp: Date.now(),
        expires: Date.now() + 24 * 60 * 60 * 1000 // 24小时过期
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('缓存缩略图失败:', error);
    }
  }

  /**
   * 从缓存获取缩略图
   */
  public getCachedThumbnail(fileId: string): ThumbnailResult | null {
    try {
      const cacheKey = `thumbnail_cache_${fileId}`;
      const cacheData = localStorage.getItem(cacheKey);
      
      if (!cacheData) return null;
      
      const parsed = JSON.parse(cacheData);
      
      // 检查是否过期
      if (Date.now() > parsed.expires) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsed.thumbnail;
    } catch (error) {
      console.warn('获取缓存缩略图失败:', error);
      return null;
    }
  }

  /**
   * 更新默认选项
   */
  public updateDefaultOptions(options: Partial<ThumbnailOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * 获取默认选项
   */
  public getDefaultOptions(): ThumbnailOptions {
    return { ...this.defaultOptions };
  }
}

/**
 * 创建缩略图生成器实例
 */
export function createThumbnailGenerator(): ThumbnailGenerator {
  return new ThumbnailGenerator();
}

/**
 * 导出缩略图生成器
 */
export default ThumbnailGenerator;
