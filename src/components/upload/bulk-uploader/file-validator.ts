/**
 * @fileoverview 文件验证器
 * @description 处理批量上传中的文件验证逻辑，从原 OptimizedBulkUploader.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

export interface FileValidationOptions {
  maxFileSize: number;
  allowedTypes: string[];
  maxFiles: number;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface BatchValidationResult {
  validFiles: File[];
  errors: Array<{ filename: string; error: string }>;
  totalSize: number;
}

/**
 * 文件验证器类
 * 负责处理文件的各种验证逻辑
 */
export class FileValidator {
  private options: FileValidationOptions;

  constructor(options: FileValidationOptions) {
    this.options = options;
  }

  /**
   * 验证单个文件
   */
  public validateFile(file: File): ValidationResult {
    // 检查文件大小
    if (file.size > this.options.maxFileSize) {
      return {
        isValid: false,
        error: `文件大小超出限制，最大允许 ${this.formatFileSize(this.options.maxFileSize)}`
      };
    }

    // 检查文件类型
    const isValidType = this.options.allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      return {
        isValid: false,
        error: `不支持的文件类型: ${file.type}`
      };
    }

    // 检查文件名
    if (!file.name || file.name.trim() === '') {
      return {
        isValid: false,
        error: '文件名不能为空'
      };
    }

    // 检查文件名长度
    if (file.name.length > 255) {
      return {
        isValid: false,
        error: '文件名过长，最大支持255个字符'
      };
    }

    // 检查文件名中的特殊字符
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(file.name)) {
      return {
        isValid: false,
        error: '文件名包含非法字符'
      };
    }

    return { isValid: true };
  }

  /**
   * 批量验证文件
   */
  public validateFiles(files: File[], existingCount: number = 0): BatchValidationResult {
    const validFiles: File[] = [];
    const errors: Array<{ filename: string; error: string }> = [];
    let totalSize = 0;

    // 检查文件数量限制
    if (existingCount + files.length > this.options.maxFiles) {
      const allowedCount = this.options.maxFiles - existingCount;
      return {
        validFiles: [],
        errors: [{
          filename: '批量验证',
          error: `文件数量超出限制，最多还能添加 ${allowedCount} 个文件`
        }],
        totalSize: 0
      };
    }

    // 检查重复文件名
    const fileNames = files.map(f => f.name);
    const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push({
        filename: '重复检查',
        error: `发现重复文件名: ${[...new Set(duplicates)].join(', ')}`
      });
    }

    // 验证每个文件
    for (const file of files) {
      const result = this.validateFile(file);
      if (result.isValid) {
        validFiles.push(file);
        totalSize += file.size;
      } else {
        errors.push({
          filename: file.name,
          error: result.error || '验证失败'
        });
      }
    }

    // 检查总文件大小
    const maxTotalSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (totalSize > maxTotalSize) {
      return {
        validFiles: [],
        errors: [{
          filename: '总大小检查',
          error: `批量上传总大小超出限制，最大允许 ${this.formatFileSize(maxTotalSize)}`
        }],
        totalSize: 0
      };
    }

    return { validFiles, errors, totalSize };
  }

  /**
   * 检查文件类型是否为图片
   */
  public isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * 检查文件类型是否为视频
   */
  public isVideoFile(file: File): boolean {
    return file.type.startsWith('video/');
  }

  /**
   * 获取文件类型分类
   */
  public getFileCategory(file: File): 'image' | 'video' | 'other' {
    if (this.isImageFile(file)) return 'image';
    if (this.isVideoFile(file)) return 'video';
    return 'other';
  }

  /**
   * 格式化文件大小
   */
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * 获取文件扩展名
   */
  public getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1).toLowerCase() : '';
  }

  /**
   * 检查文件扩展名是否被支持
   */
  public isSupportedExtension(filename: string): boolean {
    const extension = this.getFileExtension(filename);
    const supportedExtensions = [
      // 图片格式
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'tiff',
      // 视频格式
      'mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv', '3gp'
    ];
    
    return supportedExtensions.includes(extension);
  }

  /**
   * 获取MIME类型的显示名称
   */
  public getMimeTypeDisplayName(mimeType: string): string {
    const mimeTypeMap: Record<string, string> = {
      'image/jpeg': 'JPEG图片',
      'image/png': 'PNG图片',
      'image/gif': 'GIF图片',
      'image/webp': 'WebP图片',
      'image/avif': 'AVIF图片',
      'video/mp4': 'MP4视频',
      'video/webm': 'WebM视频',
      'video/ogg': 'OGG视频',
      'video/avi': 'AVI视频',
      'video/mov': 'MOV视频',
      'video/quicktime': 'QuickTime视频',
    };
    
    return mimeTypeMap[mimeType] || mimeType;
  }

  /**
   * 更新验证选项
   */
  public updateOptions(newOptions: Partial<FileValidationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * 获取当前验证选项
   */
  public getOptions(): FileValidationOptions {
    return { ...this.options };
  }

  /**
   * 验证文件内容（基础检查）
   */
  public async validateFileContent(file: File): Promise<ValidationResult> {
    try {
      // 检查文件是否为空
      if (file.size === 0) {
        return {
          isValid: false,
          error: '文件内容为空'
        };
      }

      // 对于图片文件，尝试读取文件头
      if (this.isImageFile(file)) {
        const buffer = await this.readFileHeader(file, 12);
        if (!this.isValidImageHeader(buffer)) {
          return {
            isValid: false,
            error: '图片文件格式损坏或不支持'
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: '文件内容验证失败'
      };
    }
  }

  /**
   * 读取文件头部字节
   */
  private async readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(new Uint8Array(arrayBuffer));
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsArrayBuffer(file.slice(0, bytes));
    });
  }

  /**
   * 验证图片文件头
   */
  private isValidImageHeader(buffer: Uint8Array): boolean {
    // JPEG: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }
    
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length >= 8 && 
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
      return true;
    }
    
    // GIF: 47 49 46 38
    if (buffer.length >= 4 && 
        buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return true;
    }
    
    // WebP: 52 49 46 46 ... 57 45 42 50
    if (buffer.length >= 12 && 
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return true;
    }
    
    return false;
  }
}

/**
 * 创建文件验证器实例
 */
export function createFileValidator(options: FileValidationOptions): FileValidator {
  return new FileValidator(options);
}

/**
 * 导出文件验证器
 */
export default FileValidator;
