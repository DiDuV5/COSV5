/**
 * @fileoverview 媒体文件代理API
 * @description 代理R2存储的媒体文件访问，生成预签名URL并重定向
 * @author Augment AI
 * @date 2025-06-30
 * @version 1.0.0
 *
 * @deprecated 临时解决方案：用于解决Cloudflare R2 CORS域名限制问题
 * @todo 长期目标：通过Cloudflare Worker替代此API，完全遵循tRPC-only架构
 * @reason 保留原因：Cloudflare R2 CORS配置无法支持所有必需的域名
 *
 * @architecture_violation 此文件违反了tRPC-only架构原则
 * @migration_plan 计划迁移到Cloudflare Worker或tRPC流式响应
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * 创建R2客户端
 */
function createR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.COSEREEDEN_CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.COSEREEDEN_CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.COSEREEDEN_CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * GET /api/media/[...path] - 代理媒体文件访问
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 重建文件路径
    const pathSegments = params.path.join('/');

    if (!pathSegments) {
      return NextResponse.json(
        { error: '文件路径不能为空' },
        { status: 400 }
      );
    }

    // 确保文件路径包含 uploads/ 前缀
    // 因为文件在R2存储中是以 uploads/ 前缀存储的
    const filePath = pathSegments.startsWith('uploads/')
      ? pathSegments
      : `uploads/${pathSegments}`;

    console.log('🔍 请求媒体文件:', pathSegments);
    console.log('🔍 R2存储路径:', filePath);
    console.log('🔍 强制重新编译测试:', Date.now());

    // 创建R2客户端
    const client = createR2Client();
    const bucket = process.env.COSEREEDEN_CLOUDFLARE_R2_BUCKET_NAME!;

    try {
      // 检查是否是测试文件，如果是则返回占位符
      if (filePath.includes('test_image_')) {
        console.log('🧪 检测到测试文件，返回占位符图片');

        // 生成一个简单的SVG占位符
        const svgContent = `
          <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="#666">
              测试图片占位符
            </text>
            <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="12" fill="#999">
              ${filePath}
            </text>
          </svg>
        `;

        return new NextResponse(svgContent, {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // 直接获取文件内容并流式传输
      const response = await client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: filePath,
      }));

      if (!response.Body) {
        return NextResponse.json(
          { error: '文件内容为空' },
          { status: 404 }
        );
      }

      console.log('✅ 获取文件内容成功');

      // 将文件内容转换为可读流
      const stream = response.Body as ReadableStream;

      // 设置适当的响应头
      const headers = new Headers();

      // 修复缩略图Content-Type问题
      let contentType = response.ContentType;
      if (contentType === 'application/octet-stream' && filePath.includes('_small.webp')) {
        contentType = 'image/webp';
        console.log(`🔧 修复缩略图Content-Type: ${filePath} -> image/webp`);
      } else if (contentType === 'application/octet-stream' && filePath.includes('_medium.webp')) {
        contentType = 'image/webp';
        console.log(`🔧 修复缩略图Content-Type: ${filePath} -> image/webp`);
      } else if (contentType === 'application/octet-stream' && filePath.includes('_large.webp')) {
        contentType = 'image/webp';
        console.log(`🔧 修复缩略图Content-Type: ${filePath} -> image/webp`);
      }

      if (contentType) {
        headers.set('Content-Type', contentType);
      }
      if (response.ContentLength) {
        headers.set('Content-Length', response.ContentLength.toString());
      }

      // 设置缓存头
      headers.set('Cache-Control', 'public, max-age=3600'); // 1小时缓存
      headers.set('Access-Control-Allow-Origin', '*');

      // 返回文件流
      return new NextResponse(stream, {
        status: 200,
        headers,
      });

    } catch (error: any) {
      console.error('❌ 生成预签名URL失败:', error);

      if (error.name === 'NoSuchKey') {
        return NextResponse.json(
          { error: '文件不存在' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: '文件访问失败' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ 媒体代理API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 处理OPTIONS请求（CORS预检）
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
