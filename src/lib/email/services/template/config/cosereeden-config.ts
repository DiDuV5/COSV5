/**
 * @fileoverview CoserEden邮件模板配置
 * @description CoserEden品牌配置和邮件样式定义
 * @author Augment AI
 * @date 2025-07-03
 */

import { EmailTemplateConfig } from '../email-template-base';

/**
 * CoserEden品牌配置
 */
export const COSEREEDEN_CONFIG: EmailTemplateConfig = {
  brandName: 'CoserEden',
  brandColor: '#ff6b9d', // Cosplay粉色主题
  supportEmail: 'support@cosereeden.com',
  websiteUrl: 'https://cosereeden.com',
};

/**
 * CoserEden专用CSS样式
 */
export const COSEREEDEN_STYLES = `
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
      position: relative;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="cosplay" patternUnits="userSpaceOnUse" width="20" height="20"><circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23cosplay)"/></svg>');
      opacity: 0.3;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      position: relative;
      z-index: 1;
    }
    .header .subtitle {
      margin: 8px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
      position: relative;
      z-index: 1;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #2c3e50;
      font-size: 24px;
      margin: 0 0 20px 0;
      font-weight: 600;
    }
    .content h3 {
      color: #34495e;
      font-size: 20px;
      margin: 24px 0 16px 0;
      font-weight: 600;
    }
    .content p {
      margin: 16px 0;
      font-size: 16px;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
      color: white !important;
      padding: 16px 32px;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(255, 107, 157, 0.4);
      transition: all 0.3s ease;
      border: none;
      cursor: pointer;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 107, 157, 0.6);
    }
    .btn-secondary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }
    .btn-secondary:hover {
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
    }
    .highlight-box {
      background: linear-gradient(135deg, #ff6b9d10 0%, #c4456910 100%);
      border: 2px solid #ff6b9d30;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .info-box {
      background: #f8f9fa;
      border-left: 4px solid #ff6b9d;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    .warning-box {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      color: #856404;
    }
    .success-box {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      color: #155724;
    }
    .code-block {
      background: #f1f3f4;
      border: 1px solid #dadce0;
      border-radius: 8px;
      padding: 12px 16px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      word-break: break-all;
      margin: 16px 0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }
    .stat-item {
      text-align: center;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }
    .stat-number {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: #ff6b9d;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 12px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .feature-list {
      list-style: none;
      padding: 0;
      margin: 20px 0;
    }
    .feature-list li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      position: relative;
      padding-left: 24px;
    }
    .feature-list li:before {
      content: '✨';
      position: absolute;
      left: 0;
      top: 8px;
    }
    .feature-list li:last-child {
      border-bottom: none;
    }
    .privilege-badge {
      display: inline-block;
      background: linear-gradient(135deg, #ff6b9d 0%, #c44569 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e9ecef;
    }
    .footer p {
      margin: 8px 0;
      font-size: 14px;
      color: #6c757d;
    }
    .footer a {
      color: #ff6b9d;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      padding: 8px;
      background: #ff6b9d;
      color: white;
      border-radius: 50%;
      text-decoration: none;
      width: 36px;
      height: 36px;
      line-height: 20px;
      text-align: center;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }
      .header {
        padding: 30px 20px;
      }
      .header h1 {
        font-size: 24px;
      }
      .content {
        padding: 30px 20px;
      }
      .btn {
        padding: 14px 24px;
        font-size: 14px;
      }
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
`;
