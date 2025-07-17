/**
 * @fileoverview 安全下载API端点
 * @description 通过一次性令牌验证并提供安全的下载链接访问
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccessTokenManager } from '@/server/api/routers/download-link/access-token';
import { AccessLogger, AccessLogType } from '@/server/api/routers/download-link/access-logger';
import { decryptSensitiveData } from '@/server/api/routers/download-link/utils';

/**
 * 获取客户端IP地址
 */
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || req.ip || 'unknown';
}

/**
 * 获取User-Agent
 */
function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown';
}

/**
 * 处理安全下载请求
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const ipAddress = getClientIP(request);
  const userAgent = getUserAgent(request);

  try {
    // 验证并使用访问令牌
    const tokenValidation = await AccessTokenManager.validateAndUseToken(
      prisma,
      token,
      ipAddress,
      userAgent
    );

    if (!tokenValidation.isValid) {
      // 记录失败的访问尝试
      await AccessLogger.logSuspiciousActivity(prisma, {
        suspiciousReason: `无效令牌访问: ${tokenValidation.errorMessage}`,
        ipAddress,
        userAgent,
        details: {
          token: token.substring(0, 8) + '...', // 只记录前8位
          errorMessage: tokenValidation.errorMessage,
        },
      });

      return NextResponse.json(
        {
          error: 'Access Denied',
          message: tokenValidation.errorMessage || '访问令牌无效',
        },
        { status: 403 }
      );
    }

    const tokenData = tokenValidation.tokenData!;

    // 解密下载链接信息
    const decryptedData = decryptSensitiveData({
      url: tokenData.downloadLink.url,
      extractCode: tokenData.downloadLink.extractCode,
    });

    // 记录成功的下载访问
    await AccessLogger.logDownloadAccess(prisma, {
      userId: tokenData.userId,
      downloadLinkId: tokenData.downloadLinkId,
      postId: tokenData.downloadLink.postId,
      purchaseId: tokenData.purchaseId,
      ipAddress,
      userAgent,
    });

    // 更新兑换记录的访问统计
    await prisma.downloadPurchase.update({
      where: { id: tokenData.purchaseId },
      data: {
        accessCount: { increment: 1 },
        lastAccessAt: new Date(),
      },
    });

    // 返回下载信息页面（HTML格式）
    const downloadPageHtml = generateDownloadPage({
      title: tokenData.downloadLink.title,
      platform: tokenData.downloadLink.platform,
      url: decryptedData.url,
      extractCode: decryptedData.extractCode,
      username: tokenData.user.username,
    });

    return new NextResponse(downloadPageHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('安全下载处理失败:', error);

    // 记录系统错误
    await AccessLogger.logSuspiciousActivity(prisma, {
      suspiciousReason: '系统错误导致的下载失败',
      ipAddress,
      userAgent,
      details: {
        error: error instanceof Error ? error.message : '未知错误',
        token: token.substring(0, 8) + '...',
      },
    });

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: '系统错误，请稍后重试',
      },
      { status: 500 }
    );
  }
}

/**
 * 生成下载页面HTML
 */
function generateDownloadPage(data: {
  title: string;
  platform: string;
  url: string;
  extractCode: string | null;
  username: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>安全下载 - ${data.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .title {
            color: #333;
            margin-bottom: 10px;
        }
        .platform {
            color: #666;
            font-size: 14px;
        }
        .download-info {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 15px 0;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 600;
            color: #555;
        }
        .value {
            color: #333;
            word-break: break-all;
        }
        .copy-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-left: 10px;
        }
        .copy-btn:hover {
            background: #0056b3;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">${data.title}</h1>
            <p class="platform">平台: ${data.platform}</p>
        </div>

        <div class="download-info">
            <div class="info-row">
                <span class="label">下载链接:</span>
                <div>
                    <span class="value" id="download-url">${data.url}</span>
                    <button class="copy-btn" onclick="copyToClipboard('download-url')">复制</button>
                </div>
            </div>
            ${data.extractCode ? `
            <div class="info-row">
                <span class="label">提取码:</span>
                <div>
                    <span class="value" id="extract-code">${data.extractCode}</span>
                    <button class="copy-btn" onclick="copyToClipboard('extract-code')">复制</button>
                </div>
            </div>
            ` : ''}
        </div>

        <div class="warning">
            <strong>⚠️ 安全提醒:</strong>
            <ul>
                <li>此链接为一次性访问链接，刷新页面后将失效</li>
                <li>请及时保存下载链接和提取码</li>
                <li>请勿将此页面链接分享给他人</li>
                <li>下载完成后建议清除浏览器历史记录</li>
            </ul>
        </div>

        <div class="footer">
            <p>感谢 ${data.username} 提供的资源</p>
            <p>© 2025 CoserEden - 安全下载系统</p>
        </div>
    </div>

    <script>
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;

            navigator.clipboard.writeText(text).then(() => {
                const btn = element.nextElementSibling;
                const originalText = btn.textContent;
                btn.textContent = '已复制';
                btn.style.background = '#28a745';

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#007bff';
                }, 2000);
            }).catch(() => {
                // 降级方案
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                const btn = element.nextElementSibling;
                btn.textContent = '已复制';
                setTimeout(() => btn.textContent = '复制', 2000);
            });
        }

        // 防止页面被缓存
        window.addEventListener('beforeunload', function() {
            // 清理敏感信息
            document.getElementById('download-url').textContent = '***';
            const extractCodeEl = document.getElementById('extract-code');
            if (extractCodeEl) {
                extractCodeEl.textContent = '***';
            }
        });
    </script>
</body>
</html>
  `.trim();
}
