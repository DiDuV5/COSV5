/**
 * @fileoverview MP4专用编码检测器
 * @description 专门用于检测MP4文件编码的高精度检测器
 * @author Augment AI
 * @date 2025-07-03
 */

import { normalizeCodecName } from '../utils/video-codec-utils';

/**
 * MP4专用检测器类
 */
export class MP4Detector {
  private enableLogging: boolean;

  constructor(enableLogging = true) {
    this.enableLogging = enableLogging;
  }

  /**
   * 检测MP4文件编码（增强版 - 精确识别各种编码格式）
   */
  detectMP4Codec(buffer: Buffer): string {
    try {
      if (this.enableLogging) {
        console.log('🔍 开始MP4编码检测...');
      }

      // 检查MP4文件的ftyp box和编码信息
      const ftypIndex = buffer.indexOf('ftyp');
      if (ftypIndex === -1) {
        if (this.enableLogging) {
          console.log('❌ 未找到ftyp box，可能不是有效的MP4文件');
        }
        return 'invalid_mp4';
      }

      // 解析ftyp box
      const ftypInfo = this.parseFtypBox(buffer, ftypIndex);
      if (this.enableLogging) {
        console.log('📦 ftyp box信息:', ftypInfo);
      }

      // 查找moov box中的编码信息
      const moovCodec = this.findCodecInMoov(buffer);
      if (moovCodec) {
        if (this.enableLogging) {
          console.log(`🎬 在moov box中找到编码: ${moovCodec}`);
        }
        return normalizeCodecName(moovCodec);
      }

      // 基于ftyp brand推测编码
      const brandCodec = this.guessCodecFromBrand(ftypInfo);
      if (brandCodec) {
        if (this.enableLogging) {
          console.log(`🏷️ 基于brand推测编码: ${brandCodec}`);
        }
        return normalizeCodecName(brandCodec);
      }

      // 查找stsd box中的编码信息
      const stsdCodec = this.findCodecInStsd(buffer);
      if (stsdCodec) {
        if (this.enableLogging) {
          console.log(`📋 在stsd box中找到编码: ${stsdCodec}`);
        }
        return normalizeCodecName(stsdCodec);
      }

      if (this.enableLogging) {
        console.log('⚠️ 无法确定MP4编码，使用默认值');
      }
      return 'unknown_mp4';

    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ MP4编码检测失败:', error);
      }
      return 'error_mp4';
    }
  }

  /**
   * 解析ftyp box
   */
  private parseFtypBox(buffer: Buffer, ftypIndex: number): {
    majorBrand: string;
    minorVersion: number;
    compatibleBrands: string[];
  } {
    try {
      // ftyp box结构: size(4) + type(4) + major_brand(4) + minor_version(4) + compatible_brands(...)
      const ftypStart = ftypIndex - 4; // 包含size字段
      const sizeBytes = buffer.subarray(ftypStart, ftypStart + 4);
      const size = sizeBytes.readUInt32BE(0);
      
      const majorBrand = buffer.subarray(ftypIndex + 4, ftypIndex + 8).toString('ascii');
      const minorVersion = buffer.subarray(ftypIndex + 8, ftypIndex + 12).readUInt32BE(0);
      
      const compatibleBrands: string[] = [];
      const brandsStart = ftypIndex + 12;
      const brandsEnd = Math.min(ftypStart + size, buffer.length);
      
      for (let i = brandsStart; i < brandsEnd; i += 4) {
        if (i + 4 <= brandsEnd) {
          const brand = buffer.subarray(i, i + 4).toString('ascii');
          if (brand.trim()) {
            compatibleBrands.push(brand);
          }
        }
      }

      return { majorBrand, minorVersion, compatibleBrands };
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ ftyp box解析失败:', error);
      }
      return { majorBrand: '', minorVersion: 0, compatibleBrands: [] };
    }
  }

  /**
   * 基于brand推测编码
   */
  private guessCodecFromBrand(ftypInfo: {
    majorBrand: string;
    compatibleBrands: string[];
  }): string | null {
    const allBrands = [ftypInfo.majorBrand, ...ftypInfo.compatibleBrands];
    
    for (const brand of allBrands) {
      switch (brand.toLowerCase().trim()) {
        case 'avc1':
        case 'mp41':
        case 'mp42':
        case 'isom':
          return 'h264';
        case 'hev1':
        case 'hvc1':
          return 'h265';
        case 'av01':
          return 'av1';
      }
    }
    
    return null;
  }

  /**
   * 在moov box中查找编码信息
   */
  private findCodecInMoov(buffer: Buffer): string | null {
    try {
      const moovIndex = buffer.indexOf('moov');
      if (moovIndex === -1) return null;

      // 在moov box中查找常见的编码标识
      const moovSection = buffer.subarray(moovIndex, Math.min(moovIndex + 10000, buffer.length));
      
      // 查找H.264相关标识
      if (moovSection.includes(Buffer.from('avc1')) || 
          moovSection.includes(Buffer.from('H264')) ||
          moovSection.includes(Buffer.from('h264'))) {
        return 'h264';
      }
      
      // 查找H.265相关标识
      if (moovSection.includes(Buffer.from('hev1')) || 
          moovSection.includes(Buffer.from('hvc1')) ||
          moovSection.includes(Buffer.from('H265')) ||
          moovSection.includes(Buffer.from('HEVC'))) {
        return 'h265';
      }
      
      // 查找其他编码
      if (moovSection.includes(Buffer.from('av01'))) {
        return 'av1';
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 在stsd box中查找编码信息
   */
  private findCodecInStsd(buffer: Buffer): string | null {
    try {
      const stsdIndex = buffer.indexOf('stsd');
      if (stsdIndex === -1) return null;

      // stsd box包含sample description
      const stsdSection = buffer.subarray(stsdIndex, Math.min(stsdIndex + 1000, buffer.length));
      
      // 查找编码fourcc
      const codecPatterns = [
        { pattern: 'avc1', codec: 'h264' },
        { pattern: 'avc3', codec: 'h264' },
        { pattern: 'hev1', codec: 'h265' },
        { pattern: 'hvc1', codec: 'h265' },
        { pattern: 'av01', codec: 'av1' },
        { pattern: 'vp08', codec: 'vp8' },
        { pattern: 'vp09', codec: 'vp9' }
      ];

      for (const { pattern, codec } of codecPatterns) {
        if (stsdSection.includes(Buffer.from(pattern))) {
          return codec;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查是否为有效的MP4文件
   */
  isValidMP4(buffer: Buffer): boolean {
    if (buffer.length < 20) return false;
    
    // 检查ftyp box
    const ftypIndex = buffer.indexOf('ftyp');
    if (ftypIndex === -1) return false;
    
    // 检查是否有moov box
    const moovIndex = buffer.indexOf('moov');
    if (moovIndex === -1) return false;
    
    return true;
  }

  /**
   * 获取MP4文件的基本信息
   */
  getMP4BasicInfo(buffer: Buffer): {
    hasVideo: boolean;
    hasAudio: boolean;
    estimatedDuration: number;
    fileSize: number;
  } {
    const info = {
      hasVideo: false,
      hasAudio: false,
      estimatedDuration: 0,
      fileSize: buffer.length
    };

    try {
      // 检查是否有视频轨道
      if (buffer.includes(Buffer.from('vide')) || 
          buffer.includes(Buffer.from('avc1')) ||
          buffer.includes(Buffer.from('hev1'))) {
        info.hasVideo = true;
      }

      // 检查是否有音频轨道
      if (buffer.includes(Buffer.from('soun')) || 
          buffer.includes(Buffer.from('mp4a'))) {
        info.hasAudio = true;
      }

      // 尝试估算时长（简单方法）
      const mvhdIndex = buffer.indexOf('mvhd');
      if (mvhdIndex !== -1 && mvhdIndex + 20 < buffer.length) {
        try {
          // mvhd box包含时长信息
          const timescale = buffer.readUInt32BE(mvhdIndex + 12);
          const duration = buffer.readUInt32BE(mvhdIndex + 16);
          if (timescale > 0) {
            info.estimatedDuration = duration / timescale;
          }
        } catch (error) {
          // 忽略解析错误
        }
      }

    } catch (error) {
      if (this.enableLogging) {
        console.warn('⚠️ MP4基本信息获取失败:', error);
      }
    }

    return info;
  }
}
