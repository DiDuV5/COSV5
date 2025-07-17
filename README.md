# 🎭 CoserEden - 专业Cosplay创作者平台

[![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11.4.3-2596be?logo=trpc)](https://trpc.io/)
[![Prisma](https://img.shields.io/badge/Prisma-6.11.0-2d3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.6-38b2ac?logo=tailwind-css)](https://tailwindcss.com/)

CoserEden是一个专为Cosplay创作者打造的现代化平台，提供作品展示、社区交流、创作工具等全方位服务。

## ✨ 核心功能

### 🎨 创作展示
- **高质量图片上传**：支持WebP自动转换，优化存储和加载速度
- **视频内容支持**：FFmpeg转码，多格式兼容
- **作品管理**：分类标签、草稿保存、批量操作
- **CDN加速**：Cloudflare R2存储，全球加速访问

### 👥 社区互动
- **用户系统**：6级权限管理（访客→超级管理员）
- **评论系统**：多层级回复，实时通知
- **点赞收藏**：作品互动，个人收藏夹
- **关注系统**：创作者关注，动态推送

### 🛡️ 安全特性
- **Cloudflare Turnstile**：人机验证，防止恶意注册
- **邮件验证**：SMTP集成，账户安全保障
- **权限控制**：细粒度权限管理
- **内容审核**：自动化内容审核流程

### 🚀 技术特色
- **现代化架构**：Next.js 14 + App Router
- **类型安全**：TypeScript全栈类型安全
- **高性能**：Redis缓存，数据库优化
- **响应式设计**：移动端完美适配

## 🛠️ 技术栈

### 前端技术
- **框架**：Next.js 14 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS + Radix UI
- **状态管理**：Zustand
- **表单处理**：React Hook Form + Zod
- **动画**：Framer Motion

### 后端技术
- **API**：tRPC (类型安全的API)
- **数据库**：PostgreSQL 16 + Prisma ORM
- **缓存**：Redis
- **认证**：NextAuth.js
- **文件存储**：Cloudflare R2

### 基础设施
- **部署**：PM2 + Nginx
- **CDN**：Cloudflare
- **监控**：自定义健康检查
- **CI/CD**：GitHub Actions自动化部署

## 🚀 快速开始

### 环境要求
- Node.js 18.0.0+
- PostgreSQL 16+
- Redis 6+
- npm 或 yarn

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/DiDuMi/cosereeden.git
cd cosereeden
```

2. **安装依赖**
```bash
npm install
```

3. **环境配置**
```bash
cp .env.example .env.local
# 编辑 .env.local 配置数据库和其他服务
```

4. **数据库设置**
```bash
npx prisma migrate dev
npx prisma db seed
```

5. **启动开发服务器**
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📁 项目结构

```
cosereeden/
├── src/
│   ├── app/                 # Next.js App Router页面
│   ├── components/          # React组件
│   ├── hooks/              # 自定义Hooks
│   ├── lib/                # 工具库和配置
│   ├── server/             # 服务端代码
│   ├── trpc/               # tRPC配置
│   └── types/              # TypeScript类型定义
├── prisma/                 # 数据库Schema和迁移
├── scripts/                # 部署和维护脚本
├── docs/                   # 项目文档
└── public/                 # 静态资源
```

## 🔧 开发指南

### 可用脚本

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 代码质量
npm run lint             # ESLint检查
npm run lint:fix         # 自动修复ESLint问题
npm run type-check       # TypeScript类型检查
npm run format           # Prettier格式化

# 测试
npm run test             # 运行单元测试
npm run test:coverage    # 测试覆盖率报告
npm run test:integration # 集成测试

# 数据库
npm run db:generate      # 生成Prisma客户端
npm run db:migrate       # 运行数据库迁移
npm run db:seed          # 填充测试数据
npm run db:studio        # 打开Prisma Studio

# 部署
npm run deploy:production # 生产环境部署
npm run health-check     # 健康检查
```

### 代码规范

- **文件命名**：kebab-case for utilities, PascalCase for components
- **函数长度**：≤50行
- **文件长度**：≤300行（目标），≤400行（硬限制）
- **复杂度**：≤10
- **测试覆盖率**：≥80%（核心逻辑≥90%）

## 🚀 部署指南

### 生产环境部署

1. **服务器要求**
   - Ubuntu 20.04+
   - Node.js 22.17.0
   - PostgreSQL 16
   - Redis 6
   - Nginx

2. **自动化部署**
   - 推送到master分支自动触发CI/CD
   - 自动清理临时文件和构建产物
   - 零停机部署
   - 自动回滚机制

3. **环境配置**
   - 配置环境变量
   - 设置SSL证书
   - 配置CDN域名

详细部署指南请参考：[部署文档](docs/CICD_AUTO_CLEANUP_SETUP.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React框架
- [tRPC](https://trpc.io/) - 类型安全的API
- [Prisma](https://www.prisma.io/) - 现代数据库工具
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Radix UI](https://www.radix-ui.com/) - 无样式UI组件

## 📞 联系我们

- **项目主页**：[https://cosv5.com](https://cosv5.com)
- **问题反馈**：[GitHub Issues](https://github.com/DiDuMi/cosereeden/issues)
- **邮箱**：tutu3655555@gmail.com

---

<div align="center">
  <p>用 ❤️ 为Cosplay社区打造</p>
  <p>© 2025 CoserEden. All rights reserved.</p>
</div>
