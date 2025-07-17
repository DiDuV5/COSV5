# CoserEden 集成测试

## 概述

CoserEden项目的集成测试套件，用于验证系统各组件之间的协作和端到端功能。集成测试使用真实的数据库环境和模拟的外部服务，确保系统在接近生产环境的条件下正常工作。

## 测试架构

### 测试类型

1. **数据库集成测试** (`database.test.ts`)
   - Prisma模型操作
   - 事务处理
   - 数据一致性
   - 性能测试

2. **端到端审批流程测试** (`approval-workflow.test.ts`)
   - 完整的用户审批流程
   - 批量审批操作
   - 超时处理机制
   - 审计日志完整性

3. **邮件服务集成测试** (`email-service.test.ts`)
   - 邮件发送功能
   - 模板渲染
   - 批量邮件处理
   - 通知机制

### 测试环境

- **数据库**: PostgreSQL 15 (独立测试数据库)
- **Node.js**: 18.x / 20.x
- **测试框架**: Jest
- **ORM**: Prisma
- **邮件服务**: Mock实现

## 快速开始

### 前置条件

1. **PostgreSQL服务**
   ```bash
   # 启动PostgreSQL服务
   sudo service postgresql start
   
   # 或使用Docker
   docker run --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
   ```

2. **环境变量**
   ```bash
   # 复制环境变量模板
   cp .env.example .env.test
   
   # 配置测试数据库URL
   DATABASE_URL="postgresql://postgres:password@localhost:5432/test_cosereeden"
   ```

### 运行测试

```bash
# 安装依赖
npm install

# 生成Prisma客户端
npx prisma generate

# 运行所有集成测试
npm run test:integration

# 运行特定类型的集成测试
npm run test:integration:database    # 数据库测试
npm run test:integration:workflow    # 审批流程测试
npm run test:integration:email       # 邮件服务测试

# 运行集成测试并生成覆盖率报告
npm run test:integration:coverage

# 监视模式运行集成测试
npm run test:integration:watch
```

## 测试配置

### Jest配置

集成测试使用独立的Jest配置文件 `jest.integration.config.js`：

- **测试环境**: Node.js
- **超时时间**: 30秒
- **并行度**: 1 (串行执行)
- **覆盖率阈值**: 85%

### 数据库配置

每个测试套件都会：

1. 创建独立的测试数据库
2. 运行数据库迁移
3. 执行测试用例
4. 清理测试数据
5. 删除测试数据库

### 邮件服务Mock

邮件服务使用Mock实现：

```typescript
const mockEmailService = createMockEmailService();

// 发送邮件
await mockEmailService.sendEmail({
  to: 'user@example.com',
  subject: '测试邮件',
  html: '<p>邮件内容</p>',
});

// 验证邮件发送
expectEmailToBeSent(mockEmailService, {
  to: 'user@example.com',
  subject: '测试邮件',
  contentIncludes: ['邮件内容'],
});
```

## 测试数据管理

### 测试用户创建

```typescript
// 创建普通测试用户
const user = await createTestUser({
  username: 'testuser',
  email: 'test@example.com',
  userLevel: 'USER',
  approvalStatus: 'PENDING',
});

// 创建管理员用户
const admin = await createTestAdmin({
  username: 'admin',
  email: 'admin@example.com',
});
```

### 测试场景助手

```typescript
// 创建审批场景
const { admin, pendingUser } = await IntegrationTestHelper.createApprovalScenario();

// 创建批量审批场景
const { admin, pendingUsers } = await IntegrationTestHelper.createBatchApprovalScenario(5);

// 创建超时场景
const { admin, timeoutUser } = await IntegrationTestHelper.createTimeoutScenario();
```

### 数据清理

每个测试用例执行前会自动清理测试数据：

```typescript
beforeEach(async () => {
  await cleanupTestData();
  mockEmailService.clear();
});
```

## CI/CD集成

### GitHub Actions

集成测试在以下情况下自动运行：

- 推送到 `main` 或 `develop` 分支
- 创建Pull Request
- 每日定时运行 (凌晨2点)

### 工作流程

1. **环境准备**
   - 启动PostgreSQL服务
   - 安装Node.js依赖
   - 生成Prisma客户端

2. **测试执行**
   - 运行单元测试
   - 运行集成测试
   - 生成覆盖率报告

3. **结果上传**
   - 上传测试覆盖率到Codecov
   - 归档测试结果

### 多版本测试

集成测试在多个Node.js版本上运行：

- Node.js 18.x
- Node.js 20.x

## 性能测试

### 数据库性能

```typescript
it('应该能够高效处理批量用户查询', async () => {
  // 创建大量测试数据
  const userCount = 100;
  
  // 测试查询性能
  const startTime = Date.now();
  const result = await testPrisma.user.findMany({
    where: { approvalStatus: 'PENDING' },
    take: 20,
  });
  const queryTime = Date.now() - startTime;
  
  expect(queryTime).toBeLessThan(1000); // 1秒内完成
});
```

### 邮件发送性能

```typescript
it('应该能够批量发送邮件', async () => {
  const users = await createMultipleTestUsers(50);
  
  const startTime = Date.now();
  await Promise.all(
    users.map(user => mockEmailService.sendEmail({
      to: user.email,
      subject: '批量邮件',
      html: '<p>测试内容</p>',
    }))
  );
  const sendTime = Date.now() - startTime;
  
  expect(sendTime).toBeLessThan(5000); // 5秒内完成
});
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查PostgreSQL服务状态
   sudo service postgresql status
   
   # 检查端口占用
   netstat -an | grep 5432
   ```

2. **权限错误**
   ```bash
   # 确保PostgreSQL用户有创建数据库权限
   sudo -u postgres createuser --createdb --login test_user
   ```

3. **测试超时**
   ```bash
   # 增加测试超时时间
   npm run test:integration -- --testTimeout=60000
   ```

### 调试技巧

1. **启用详细日志**
   ```bash
   DEBUG=* npm run test:integration
   ```

2. **运行单个测试文件**
   ```bash
   npm run test:integration -- database.test.ts
   ```

3. **跳过数据库清理**
   ```typescript
   // 在测试中添加
   afterEach(async () => {
     // 注释掉清理代码以检查数据状态
     // await cleanupTestData();
   });
   ```

## 最佳实践

### 测试编写

1. **独立性**: 每个测试用例应该独立，不依赖其他测试的状态
2. **清理**: 测试前后要清理数据，避免数据污染
3. **断言**: 使用具体的断言，避免过于宽泛的检查
4. **命名**: 使用描述性的测试名称，清楚表达测试意图

### 性能考虑

1. **批量操作**: 优先使用批量数据库操作
2. **连接池**: 合理配置数据库连接池
3. **索引**: 确保测试查询有适当的索引支持
4. **并发**: 控制并发测试数量，避免资源竞争

### 维护

1. **定期更新**: 随着功能变更及时更新测试用例
2. **覆盖率监控**: 保持高覆盖率，关注覆盖率变化
3. **性能监控**: 监控测试执行时间，及时发现性能问题
4. **文档更新**: 保持测试文档与实际实现同步

## 贡献指南

### 添加新测试

1. 在相应的测试文件中添加测试用例
2. 使用现有的测试工具和助手函数
3. 确保测试具有良好的覆盖率
4. 添加必要的文档说明

### 修改现有测试

1. 理解测试的原始意图
2. 保持测试的独立性
3. 更新相关文档
4. 验证修改不影响其他测试

---

更多信息请参考：
- [单元测试文档](../README.md)
- [API文档](../../server/api/README.md)
- [数据库Schema](../../../prisma/schema.prisma)
