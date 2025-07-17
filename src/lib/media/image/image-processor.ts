/**
 * @fileoverview 图片处理系统
 * @description 使用Sharp库实现图片自动压缩、格式转换和多尺寸生成
 * @author Augment AI
 * @date 2025-06-15
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * const processor = new ImageProcessor();
 * const result = await processor.processImage(buffer, 'photo.jpg');
 *
 * @dependencies
 * - sharp: 图片处理库
 * - fs: 文件系统操作
 * - path: 路径处理
 *
 * @changelog
 * - 2025-06-15: 初始版本创建，支持多尺寸生成和WebP转换
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export interface ImageSize {
  name: string;
  width: number;
  height: number;
  quality: number;
  format?: 'jpeg' | 'png' | 'webp';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export interface ProcessedImage {
  size: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  buffer: Buffer;
  filename: string;
}

export interface ImageProcessingResult {
  success: boolean;
  originalInfo?: {
    width: number;
    height: number;
    format: string;
    fileSize: number;
  };
  processedImages?: ProcessedImage[];
  error?: string;
  processingTime?: number;
}

export interface ImageProcessingOptions {
  /** 是否生成WebP格式 */
  generateWebP?: boolean;
  /** 是否保持原始格式 */
  keepOriginalFormat?: boolean;
  /** 自定义尺寸配置 */
  customSizes?: ImageSize[];
  /** 是否生成缩略图 */
  generateThumbnails?: boolean;
  /** 输出目录 */
  outputDir?: string;
}

export class ImageProcessor {
  private tempDir: string;
  
  // 预定义的图片尺寸配置
  private readonly defaultSizes: ImageSize[] = [
    {
      name: 'thumbnail',
      width: 150,
      height: 150,
      quality: 80,
      format: 'jpeg',
      fit: 'cover'
    },
    {
      name: 'small',
      width: 400,
      height: 400,
      quality: 85,
      format: 'jpeg',
      fit: 'inside'
    },
    {
      name: 'medium',
      width: 800,
      height: 800,
      quality: 90,
      format: 'jpeg',
      fit: 'inside'
    },
    {
      name: 'large',
      width: 1920,
      height: 1080,
      quality: 95,
      format: 'jpeg',
      fit: 'inside'
    }
  ];

  constructor(tempDir?: string) {
    this.tempDir = tempDir || path.join(process.cwd(), 'temp', 'image-processing');
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 获取图片信息
   */
  async getImageInfo(buffer: Buffer): Promise<sharp.Metadata> {
    try {
      return await sharp(buffer).metadata();
    } catch (error) {
      throw new Error(`Failed to get image info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 处理单张图片，生成多个尺寸版本
   */
  async processImage(
    buffer: Buffer, 
    originalFilename: string, 
    options: ImageProcessingOptions = {}
  ): Promise<ImageProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🖼️ 开始处理图片: ${originalFilename}`);
      
      // 获取原始图片信息
      const originalInfo = await this.getImageInfo(buffer);
      
      if (!originalInfo.width || !originalInfo.height) {
        throw new Error('Invalid image: missing width or height');
      }
      
      console.log(`📊 原始图片信息:`);
      console.log(`   尺寸: ${originalInfo.width}x${originalInfo.height}`);
      console.log(`   格式: ${originalInfo.format}`);
      console.log(`   大小: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
      
      const {
        generateWebP = true,
        keepOriginalFormat = true,
        customSizes,
        generateThumbnails = true
      } = options;
      
      // 确定要生成的尺寸
      const sizesToProcess = customSizes || this.defaultSizes;
      const processedImages: ProcessedImage[] = [];
      
      // 处理每个尺寸
      for (const sizeConfig of sizesToProcess) {
        // 跳过比原图更大的尺寸
        if (sizeConfig.width > originalInfo.width! && sizeConfig.height > originalInfo.height!) {
          console.log(`⏭️ 跳过 ${sizeConfig.name}: 目标尺寸大于原图`);
          continue;
        }
        
        // 生成原始格式版本
        if (keepOriginalFormat) {
          const processed = await this.processImageSize(
            buffer, 
            originalFilename, 
            sizeConfig, 
            originalInfo.format as any
          );
          processedImages.push(processed);
        }
        
        // 生成WebP版本
        if (generateWebP && originalInfo.format !== 'webp') {
          const webpConfig = { ...sizeConfig, format: 'webp' as const };
          const processed = await this.processImageSize(
            buffer, 
            originalFilename, 
            webpConfig, 
            'webp'
          );
          processedImages.push(processed);
        }
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      console.log(`✅ 图片处理完成: ${originalFilename}`);
      console.log(`📈 生成版本: ${processedImages.length}个`);
      console.log(`⏱️ 处理耗时: ${processingTime}ms`);
      
      return {
        success: true,
        originalInfo: {
          width: originalInfo.width,
          height: originalInfo.height,
          format: originalInfo.format || 'unknown',
          fileSize: buffer.length
        },
        processedImages,
        processingTime
      };
      
    } catch (error) {
      console.error(`❌ 图片处理失败: ${originalFilename}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 处理单个尺寸的图片
   */
  private async processImageSize(
    buffer: Buffer,
    originalFilename: string,
    sizeConfig: ImageSize,
    outputFormat: 'jpeg' | 'png' | 'webp'
  ): Promise<ProcessedImage> {
    const { name, width, height, quality, fit = 'inside' } = sizeConfig;
    
    // 生成输出文件名
    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    const baseName = path.parse(originalFilename).name;
    const filename = `${baseName}_${name}.${ext}`;
    
    console.log(`🔄 处理尺寸: ${name} (${width}x${height}, ${outputFormat})`);
    
    let sharpInstance = sharp(buffer)
      .resize(width, height, { 
        fit,
        withoutEnlargement: true // 防止放大
      });
    
    // 根据格式设置输出选项
    switch (outputFormat) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ 
          quality,
          progressive: true,
          mozjpeg: true
        });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ 
          quality,
          progressive: true,
          compressionLevel: 9
        });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ 
          quality,
          effort: 6
        });
        break;
    }
    
    const processedBuffer = await sharpInstance.toBuffer();
    const metadata = await sharp(processedBuffer).metadata();
    
    console.log(`✅ ${name} 处理完成: ${(processedBuffer.length / 1024).toFixed(1)}KB`);
    
    return {
      size: name,
      width: metadata.width || width,
      height: metadata.height || height,
      format: outputFormat,
      fileSize: processedBuffer.length,
      buffer: processedBuffer,
      filename
    };
  }

  /**
   * 批量处理图片
   */
  async processBatch(
    images: Array<{ buffer: Buffer; filename: string }>,
    options: ImageProcessingOptions = {}
  ): Promise<ImageProcessingResult[]> {
    console.log(`🔄 开始批量处理 ${images.length} 张图片`);
    
    const results: ImageProcessingResult[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const { buffer, filename } = images[i];
      console.log(`📷 处理第 ${i + 1}/${images.length} 张: ${filename}`);
      
      const result = await this.processImage(buffer, filename, options);
      results.push(result);
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    console.log(`📊 批量处理完成:`);
    console.log(`   成功: ${successCount}张`);
    console.log(`   失败: ${failCount}张`);
    
    return results;
  }

  /**
   * 验证图片格式
   */
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height && metadata.format);
    } catch {
      return false;
    }
  }

  /**
   * 获取支持的图片格式
   */
  getSupportedFormats(): string[] {
    return ['jpeg', 'jpg', 'png', 'webp', 'tiff', 'gif', 'svg', 'avif', 'heif'];
  }

  /**
   * 清理临时文件
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.tempDir)) {
        fs.rmSync(this.tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`⚠️ 清理临时文件失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
