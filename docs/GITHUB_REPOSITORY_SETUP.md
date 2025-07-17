# 🚀 CoserEden GitHub仓库手动设置指南

## 📋 当前状态

✅ **已完成的步骤：**
- 本地Git仓库已初始化
- 代码已清理并创建初始提交
- 远程origin已配置：`https://github.com/DiDuMi/cosereeden.git`
- CI/CD自动清理系统已准备就绪
- 项目文档已完善

⚠️ **需要手动完成的步骤：**
- 在GitHub上创建cosereeden仓库
- 推送代码到GitHub
- 配置GitHub Secrets
- 验证CI/CD工作流

## 🔧 手动设置步骤

### 1. 创建GitHub仓库

1. **访问GitHub创建仓库页面**
   ```
   https://github.com/new
   ```

2. **填写仓库信息**
   - **Repository name**: `cosereeden`
   - **Description**: `🎭 CoserEden - 专业Cosplay创作者平台 | Next.js 14 + tRPC + Prisma`
   - **Visibility**: Public (推荐) 或 Private
   - **Initialize**: 不要勾选任何初始化选项（README, .gitignore, license）

3. **点击 "Create repository"**

### 2. 推送代码到GitHub

在本地项目目录执行：

```bash
# 确认远程仓库配置
git remote -v

# 推送代码到GitHub
git push -u origin master

# 如果推送失败，可能需要强制推送（仅首次）
git push -u origin master --force
```

### 3. 配置GitHub Secrets

在GitHub仓库页面，进入 **Settings** → **Secrets and variables** → **Actions**，添加以下Secrets：

#### 必需的Secrets：

1. **PRODUCTION_SSH_KEY**
   ```bash
   # 在本地生成SSH密钥（如果还没有）
   ssh-keygen -t rsa -b 4096 -C "github-actions@cosereeden"
   
   # 将公钥添加到生产服务器
   ssh-copy-id root@185.170.198.240
   
   # 复制私钥内容到GitHub Secret
   cat ~/.ssh/id_rsa
   ```

#### 可选的Secrets（用于增强功能）：

2. **TELEGRAM_BOT_TOKEN** - 用于部署通知
3. **SLACK_WEBHOOK_URL** - 用于Slack通知

### 4. 验证仓库设置

1. **检查仓库基本信息**
   - 确认仓库描述和标签正确
   - 设置主页URL：`https://cosv5.com`

2. **配置仓库设置**
   - 启用Issues和Projects
   - 禁用Wiki（如果不需要）
   - 启用自动删除合并分支

3. **添加仓库标签（Topics）**
   ```
   nextjs, typescript, trpc, prisma, tailwindcss, 
   cosplay, react, nodejs, postgresql, cloudflare, redis
   ```

### 5. 测试CI/CD工作流

1. **创建测试提交**
   ```bash
   # 修改README或添加小的改动
   echo "# 测试CI/CD" >> test-cicd.md
   git add test-cicd.md
   git commit -m "test: 验证CI/CD自动部署"
   git push origin master
   ```

2. **检查GitHub Actions**
   - 访问仓库的 **Actions** 标签页
   - 确认工作流正常触发
   - 检查各个步骤的执行状态

### 6. 生产服务器准备

确保生产服务器已准备就绪：

```bash
# SSH连接到生产服务器
ssh root@185.170.198.240

# 创建必要目录
mkdir -p /root/backups
mkdir -p /var/log

# 设置日志文件
touch /var/log/cosereeden-cleanup.log
touch /var/log/cosereeden-deploy.log
chmod 644 /var/log/cosereeden-*.log

# 确保项目目录存在
mkdir -p /root/cosereeden6

# 检查必要服务
systemctl status postgresql
systemctl status redis
systemctl status nginx
pm2 status
```

## 🔍 验证清单

### GitHub仓库验证
- [ ] 仓库已创建并可访问
- [ ] 代码已成功推送
- [ ] README.md正确显示
- [ ] 仓库描述和标签已设置

### GitHub Secrets验证
- [ ] PRODUCTION_SSH_KEY已配置
- [ ] SSH密钥可以连接到生产服务器
- [ ] 其他必要的Secrets已添加

### CI/CD工作流验证
- [ ] GitHub Actions工作流可以触发
- [ ] 预检查步骤通过（类型检查、测试）
- [ ] 清理步骤正常执行
- [ ] 部署步骤成功完成
- [ ] 部署后验证通过

### 生产环境验证
- [ ] 生产服务器可以SSH连接
- [ ] 必要的目录和文件已创建
- [ ] 服务（PostgreSQL、Redis、Nginx）正常运行
- [ ] PM2进程管理器可用

## 🚨 故障排除

### 推送失败
```bash
# 如果遇到认证问题，重新配置远程仓库
git remote set-url origin https://ghp_YOUR_NEW_TOKEN@github.com/DiDuMi/cosereeden.git

# 如果遇到历史冲突，强制推送（谨慎使用）
git push origin master --force
```

### SSH连接问题
```bash
# 测试SSH连接
ssh -T git@github.com

# 如果失败，检查SSH密钥
ssh-add -l
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
```

### CI/CD失败
1. 检查GitHub Actions日志
2. 验证Secrets配置
3. 确认生产服务器状态
4. 检查脚本权限

## 📞 获取帮助

如果遇到问题：

1. **查看GitHub Actions日志**：仓库 → Actions → 选择失败的工作流
2. **检查生产服务器日志**：`/var/log/cosereeden-*.log`
3. **验证网络连接**：确保GitHub和生产服务器之间网络畅通
4. **联系技术支持**：提供详细的错误信息和日志

## 🎯 下一步

完成GitHub仓库设置后：

1. **配置域名和SSL**：设置cosv5.com域名解析
2. **数据库迁移**：运行生产环境数据库迁移
3. **环境变量配置**：设置生产环境变量
4. **监控设置**：配置应用监控和告警
5. **备份策略**：建立定期备份机制

---

*最后更新: 2025-07-17*
