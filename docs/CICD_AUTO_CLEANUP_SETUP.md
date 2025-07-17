# CoserEden CI/CD 自动清理系统设置指南

## 🎯 系统概述

CoserEden CI/CD自动清理系统是一个完善的自动化解决方案，能够在每次代码推送到生产环境时自动识别并删除废弃文件，确保生产环境始终保持整洁。

## 🔧 核心功能

### 自动清理功能
- ✅ 构建产物清理：`.next/`, `coverage/`, `dist/`, `build/`
- ✅ 临时文件清理：`*.log`, `*.tmp`, `*.bak`, `*.old`, `temp/`, `uploads/`
- ✅ 过期备份管理：自动保留最近3个版本
- ✅ PM2日志清理和系统缓存优化
- ✅ 安全检查，避免误删重要文件

### 部署集成
- ✅ 零停机部署
- ✅ 自动回滚机制
- ✅ 健康检查验证
- ✅ 详细的清理和部署报告

## 🚀 快速设置

### 1. GitHub Secrets 配置

在GitHub仓库设置中添加以下Secrets：

```
PRODUCTION_SSH_KEY
```

**获取SSH密钥的方法：**

```bash
# 在本地生成SSH密钥对
ssh-keygen -t rsa -b 4096 -C "github-actions@cosereeden"

# 将公钥添加到生产服务器
ssh-copy-id root@185.170.198.240

# 将私钥内容复制到GitHub Secrets
cat ~/.ssh/id_rsa
```

### 2. 生产服务器准备

在生产服务器上执行以下命令：

```bash
# 创建必要的目录
mkdir -p /root/backups
mkdir -p /var/log

# 设置日志文件权限
touch /var/log/cosereeden-cleanup.log
touch /var/log/cosereeden-deploy.log
chmod 644 /var/log/cosereeden-*.log

# 确保项目目录存在
mkdir -p /root/cosereeden6
```

### 3. 验证设置

推送代码到master分支，观察GitHub Actions的执行情况：

```bash
git add .
git commit -m "feat: 启用CI/CD自动清理系统"
git push origin master
```

## 📋 工作流程详解

### 自动触发条件
- 推送到 `master` 或 `main` 分支
- 手动触发（支持自定义清理模式）

### 执行阶段

#### 1. 预检查和构建 (pre-deploy-checks)
- ✅ 代码检出和依赖安装
- ✅ TypeScript类型检查
- ✅ 单元测试执行
- ✅ 应用构建验证
- ✅ 部署策略确定

#### 2. 生产环境清理 (production-cleanup)
- ✅ SSH连接到生产服务器
- ✅ 执行自动清理脚本
- ✅ 清理结果验证
- ✅ 安全检查确认

#### 3. 应用部署 (deploy-application)
- ✅ 创建部署包
- ✅ 上传到生产服务器
- ✅ 零停机部署执行
- ✅ 服务重启和验证

#### 4. 部署后验证 (post-deploy-verification)
- ✅ 应用健康检查
- ✅ 生成清理报告
- ✅ 上传部署日志
- ✅ 状态通知

## 🛠️ 清理模式说明

### 自动模式 (auto) - 默认
- 标准清理流程
- 安全检查和备份
- 适用于日常部署

### 强制模式 (force)
- 深度清理，包括系统缓存
- 更彻底的空间释放
- 适用于磁盘空间紧张时

### 跳过模式 (skip)
- 跳过清理步骤
- 仅执行部署
- 适用于紧急修复

## 📊 监控和报告

### 清理报告内容
- 🖥️ 系统信息和资源使用
- 💾 磁盘空间变化统计
- 🧹 清理历史和效果
- 🚀 部署历史记录
- 💾 备份状态管理
- 📊 项目文件统计
- 🔒 安全检查结果
- ⚠️ 建议和警告信息

### 日志文件位置
- **清理日志**: `/var/log/cosereeden-cleanup.log`
- **部署日志**: `/var/log/cosereeden-deploy.log`
- **备份目录**: `/root/backups/`

## 🔒 安全特性

### 文件保护机制
- ✅ 重要配置文件自动备份
- ✅ 数据库迁移文件保护
- ✅ 环境变量文件保留
- ✅ 白名单机制防止误删

### 回滚机制
- ✅ 自动备份创建
- ✅ 部署失败自动回滚
- ✅ 配置文件恢复
- ✅ 服务状态恢复

## 🎛️ 自定义配置

### 修改清理规则

编辑 `scripts/production-auto-cleanup.sh` 文件：

```bash
# 修改备份保留数量
MAX_BACKUPS=5

# 添加自定义清理规则
cleanup_custom_files() {
    # 你的自定义清理逻辑
}
```

### 调整部署策略

编辑 `scripts/deploy-with-cleanup.sh` 文件：

```bash
# 修改健康检查超时
HEALTH_CHECK_TIMEOUT=30

# 自定义部署后操作
post_deploy_custom() {
    # 你的自定义部署后逻辑
}
```

## 🚨 故障排除

### 常见问题

#### 1. SSH连接失败
```bash
# 检查SSH密钥
ssh -T root@185.170.198.240

# 验证密钥格式
cat ~/.ssh/id_rsa | head -1
# 应该显示: -----BEGIN OPENSSH PRIVATE KEY-----
```

#### 2. 清理脚本执行失败
```bash
# 检查脚本权限
ls -la scripts/production-auto-cleanup.sh

# 手动执行测试
bash scripts/production-auto-cleanup.sh auto test 1
```

#### 3. 部署验证失败
```bash
# 检查应用状态
pm2 list

# 检查端口监听
netstat -tlnp | grep :3000

# 手动健康检查
curl http://localhost:3000/api/health
```

### 紧急恢复

如果部署失败需要紧急恢复：

```bash
# 查看最新备份
ls -la /root/backups/

# 手动回滚
cd /root/cosereeden6
bash scripts/rollback.sh
```

## 📈 性能优化建议

### 定期维护
- 每月检查备份目录大小
- 定期清理旧日志文件
- 监控磁盘使用趋势

### 优化配置
- 根据服务器性能调整清理频率
- 优化备份策略减少存储占用
- 配置日志轮转避免日志文件过大

## 🔄 版本更新

当需要更新清理系统时：

1. 更新脚本文件
2. 测试新功能
3. 更新文档
4. 推送到仓库触发部署

## 📞 技术支持

如遇到问题，请：

1. 查看GitHub Actions执行日志
2. 检查生产服务器日志文件
3. 参考故障排除指南
4. 联系技术团队

---

*最后更新: 2025-07-17*
