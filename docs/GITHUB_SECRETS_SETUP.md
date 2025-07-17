# GitHub Secrets配置指南

## 📋 概述

本文档详细说明如何为CoserEden项目配置GitHub Secrets，以支持CI/CD自动部署流程。

## 🔑 必需的Secrets

### 部署配置

#### DEPLOY_HOST
```
185.170.198.240
```

#### DEPLOY_USER
```
deploy
```

#### DEPLOY_KEY
```
# SSH私钥内容，从以下文件复制：
# ./cicd-keys/deploy_key
```

### 通知配置

#### TELEGRAM_BOT_TOKEN
```
7863732527:AAEQLUJl69nNH5n_DENxoDqTAq0-f_S7kk0
```

#### TELEGRAM_CHAT_ID
```
# 需要获取您的Telegram Chat ID
# 请按照以下步骤获取：
# 1. 在Telegram中搜索 @CosV5Bot
# 2. 发送 /start 命令
# 3. 访问: https://api.telegram.org/bot7863732527:AAEQLUJl69nNH5n_DENxoDqTAq0-f_S7kk0/getUpdates
# 4. 在JSON响应中找到 "chat":{"id":数字} 中的数字
```

### 环境变量

#### NEXTAUTH_SECRET
```
# 自动生成的32字节随机密钥
# 从服务器环境变量文件中获取
```

#### DATABASE_URL
```
postgresql://douyusm:douyusm@localhost:5432/douyusm
```

#### REDIS_URL
```
redis://:douyusm@localhost:6379
```

### Cloudflare R2配置

#### CLOUDFLARE_R2_ACCESS_KEY_ID
```
fyydDpbSf9eYa1T1BkPA8x-Dg-vNVJZ0jaQLGT5n
```

#### CLOUDFLARE_R2_SECRET_ACCESS_KEY
```
693862c8b2839064c03e518882e806be2d159
```

### 邮件配置

#### SMTP_HOST
```
smtp.hostinger.com
```

#### SMTP_PORT
```
465
```

#### SMTP_USER
```
admin@cosv5.com
```

#### SMTP_PASS
```
CosV5Admin2024!
```

#### SMTP_FROM
```
CoserEden <admin@cosv5.com>
```

### Turnstile配置

#### TURNSTILE_SECRET_KEY
```
0x4AAAAAABkbXC_NcaMH-RvbqXYJASS_6q8
```

## 🛠️ 配置步骤

### 1. 访问GitHub仓库设置

1. 打开GitHub仓库页面
2. 点击 **Settings** 标签
3. 在左侧菜单中选择 **Secrets and variables** > **Actions**

### 2. 添加Repository Secrets

对于上述每个Secret：

1. 点击 **New repository secret**
2. 输入Secret名称（如 `DEPLOY_HOST`）
3. 输入Secret值
4. 点击 **Add secret**

### 3. 获取SSH私钥

```bash
# 在本地项目目录中执行
cat ./cicd-keys/deploy_key
```

复制完整的私钥内容（包括 `-----BEGIN OPENSSH PRIVATE KEY-----` 和 `-----END OPENSSH PRIVATE KEY-----`）

### 4. 获取NextAuth Secret

```bash
# 在服务器上执行
ssh -i ./cicd-keys/deploy_key deploy@185.170.198.240 "grep '^NEXTAUTH_SECRET=' /var/www/cosereeden/shared/.env.production | cut -d'=' -f2"
```

### 5. 获取Telegram Chat ID

#### 方法1: 与Bot交互
1. 在Telegram中搜索 `@CosV5Bot`
2. 发送 `/start` 命令
3. 访问: https://api.telegram.org/bot7863732527:AAEQLUJl69nNH5n_DENxoDqTAq0-f_S7kk0/getUpdates
4. 在JSON响应中找到您的Chat ID

#### 方法2: 使用脚本
```bash
# 运行交互式配置
./scripts/setup-telegram-bot.sh --interactive
```

## ✅ 验证配置

### 1. 检查Secrets列表

确保以下Secrets已正确配置：

- [x] DEPLOY_HOST
- [x] DEPLOY_USER  
- [x] DEPLOY_KEY
- [x] TELEGRAM_BOT_TOKEN
- [ ] TELEGRAM_CHAT_ID (需要获取)
- [x] NEXTAUTH_SECRET
- [x] DATABASE_URL
- [x] REDIS_URL
- [x] CLOUDFLARE_R2_ACCESS_KEY_ID
- [x] CLOUDFLARE_R2_SECRET_ACCESS_KEY
- [x] SMTP_HOST
- [x] SMTP_PORT
- [x] SMTP_USER
- [x] SMTP_PASS
- [x] SMTP_FROM
- [x] TURNSTILE_SECRET_KEY

### 2. 测试CI/CD流程

配置完成后，推送代码到main分支测试自动部署：

```bash
git add .
git commit -m "feat: 配置生产环境和CI/CD"
git push origin main
```

### 3. 监控部署状态

1. 访问GitHub Actions页面
2. 查看最新的工作流运行状态
3. 检查Telegram通知是否正常接收

## 🔒 安全注意事项

### 1. Secret管理
- ✅ 所有敏感信息通过GitHub Secrets管理
- ✅ 不在代码中硬编码任何密钥
- ✅ 定期轮换密钥和密码

### 2. 访问控制
- ✅ 限制仓库访问权限
- ✅ 使用专用的部署用户
- ✅ SSH密钥仅用于部署

### 3. 监控和审计
- ✅ 启用GitHub Actions日志
- ✅ 监控部署通知
- ✅ 定期检查访问日志

## 🚨 故障排除

### 常见问题

#### 1. SSH连接失败
- 检查DEPLOY_KEY是否完整
- 确认服务器SSH服务正常
- 验证deploy用户权限

#### 2. Telegram通知失败
- 确认TELEGRAM_BOT_TOKEN正确
- 验证TELEGRAM_CHAT_ID有效
- 检查Bot是否已启动

#### 3. 数据库连接失败
- 确认DATABASE_URL格式正确
- 检查数据库服务状态
- 验证用户权限

#### 4. 环境变量问题
- 检查所有必需的Secrets是否已配置
- 确认Secret名称拼写正确
- 验证Secret值格式

### 调试命令

```bash
# 测试SSH连接
./scripts/test-cicd.sh --ssh

# 测试环境配置
./scripts/test-cicd.sh --env

# 运行完整测试
./scripts/test-cicd.sh --all
```

## 📞 支持

如果遇到配置问题：

1. 检查GitHub Actions日志
2. 查看服务器部署日志
3. 运行本地测试脚本
4. 参考故障排除文档

---

**配置完成后，您的CoserEden项目将支持：**
- 🚀 自动化CI/CD部署
- 📱 Telegram通知
- 🔒 Turnstile安全验证
- 📊 完整的监控和日志

**下一步**: 配置完所有Secrets后，推送代码触发首次自动部署！
