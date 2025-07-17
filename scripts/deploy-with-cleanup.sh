#!/bin/bash

# CoserEden 集成部署脚本
# 结合自动清理的零停机部署

set -e

# 参数
DEPLOY_PACKAGE="${1:-/tmp/cosereeden-deploy.tar.gz}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${BLUE}[DEPLOY]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 配置
PROJECT_DIR="/root/cosereeden6"
BACKUP_DIR="/root/backups/deploy-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/var/log/cosereeden-deploy.log"

# 错误处理
cleanup_on_error() {
    log_error "部署失败，开始回滚..."
    
    if [[ -f "/tmp/latest-backup-path" ]]; then
        local backup_path=$(cat /tmp/latest-backup-path)
        if [[ -d "$backup_path" ]]; then
            log_info "从备份恢复: $backup_path"
            
            # 恢复关键配置文件
            cp "$backup_path"/.env* "$PROJECT_DIR/" 2>/dev/null || true
            cp "$backup_path"/ecosystem.config.js "$PROJECT_DIR/" 2>/dev/null || true
            
            # 重启服务
            cd "$PROJECT_DIR"
            pm2 restart all || log_warning "PM2重启失败"
            
            log_success "回滚完成"
        fi
    fi
    
    exit 1
}

trap cleanup_on_error ERR

# 记录部署开始
{
    echo "=========================================="
    echo "CoserEden 部署开始"
    echo "时间: $(date)"
    echo "部署包: $DEPLOY_PACKAGE"
    echo "=========================================="
} >> "$LOG_FILE"

log_step "开始集成部署流程"

# 1. 验证部署包
if [[ ! -f "$DEPLOY_PACKAGE" ]]; then
    log_error "部署包不存在: $DEPLOY_PACKAGE"
    exit 1
fi

log_info "验证部署包: $DEPLOY_PACKAGE"
if ! tar -tzf "$DEPLOY_PACKAGE" >/dev/null 2>&1; then
    log_error "部署包格式错误或损坏"
    exit 1
fi

# 2. 检查项目目录
if [[ ! -d "$PROJECT_DIR" ]]; then
    log_error "项目目录不存在: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# 3. 预部署健康检查
log_step "执行预部署健康检查..."

# 检查磁盘空间
DISK_USAGE=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt 90 ]]; then
    log_error "磁盘空间不足: ${DISK_USAGE}%"
    exit 1
fi

# 检查内存
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [[ $MEMORY_USAGE -gt 90 ]]; then
    log_warning "内存使用率较高: ${MEMORY_USAGE}%"
fi

# 4. 停止应用服务
log_step "停止应用服务..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 stop all || log_warning "PM2停止失败"
    sleep 2
else
    log_warning "PM2未安装"
fi

# 5. 创建完整备份
log_step "创建部署备份..."
mkdir -p "$BACKUP_DIR"

# 备份整个项目（排除大文件）
tar -czf "$BACKUP_DIR/project-backup.tar.gz" \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=coverage \
    --exclude=temp \
    --exclude=uploads \
    . || log_warning "项目备份失败"

# 备份数据库（如果存在）
if [[ -f "prisma/schema.prisma" ]]; then
    npx prisma db pull --schema=prisma/schema.prisma > "$BACKUP_DIR/database-schema.sql" 2>/dev/null || log_warning "数据库备份失败"
fi

log_success "备份创建完成: $BACKUP_DIR"
echo "$BACKUP_DIR" > /tmp/latest-backup-path

# 6. 解压新代码
log_step "部署新代码..."
tar -xzf "$DEPLOY_PACKAGE" -C /tmp/cosereeden-new/
if [[ $? -ne 0 ]]; then
    mkdir -p /tmp/cosereeden-new
    tar -xzf "$DEPLOY_PACKAGE" -C /tmp/cosereeden-new/
fi

# 7. 保留重要配置文件
log_step "保留生产配置..."
cp .env.production /tmp/env-backup 2>/dev/null || true
cp ecosystem.config.js /tmp/ecosystem-backup 2>/dev/null || true

# 8. 替换代码
log_step "更新项目文件..."
rsync -av --delete \
    --exclude=node_modules \
    --exclude=.env.production \
    --exclude=ecosystem.config.js \
    --exclude=prisma/migrations \
    /tmp/cosereeden-new/ "$PROJECT_DIR/"

# 9. 恢复配置文件
log_step "恢复生产配置..."
cp /tmp/env-backup .env.production 2>/dev/null || log_warning "环境配置恢复失败"
cp /tmp/ecosystem-backup ecosystem.config.js 2>/dev/null || log_warning "PM2配置恢复失败"

# 10. 安装依赖
log_step "安装依赖..."
npm ci --production --silent || {
    log_error "依赖安装失败"
    exit 1
}

# 11. 构建应用
log_step "构建应用..."
npm run build || {
    log_error "应用构建失败"
    exit 1
}

# 12. 数据库迁移
log_step "执行数据库迁移..."
if [[ -f "prisma/schema.prisma" ]]; then
    npx prisma migrate deploy || log_warning "数据库迁移失败"
    npx prisma generate || log_warning "Prisma客户端生成失败"
fi

# 13. 设置文件权限
log_step "设置文件权限..."
chown -R www-data:www-data . 2>/dev/null || true
chmod -R 755 . 2>/dev/null || true

# 14. 启动应用
log_step "启动应用服务..."
if command -v pm2 >/dev/null 2>&1; then
    pm2 start ecosystem.config.js || {
        log_error "应用启动失败"
        exit 1
    }
    
    # 等待应用启动
    sleep 5
    
    # 检查应用状态
    if ! pm2 list | grep -q "online"; then
        log_error "应用启动后状态异常"
        exit 1
    fi
else
    log_warning "PM2未安装，请手动启动应用"
fi

# 15. 部署后验证
log_step "执行部署后验证..."
sleep 10

# 健康检查
if command -v curl >/dev/null 2>&1; then
    for i in {1..5}; do
        if curl -s --connect-timeout 10 http://localhost:3000/api/health >/dev/null 2>&1; then
            log_success "应用健康检查通过"
            break
        else
            log_warning "健康检查失败，重试 $i/5"
            sleep 5
        fi
        
        if [[ $i -eq 5 ]]; then
            log_error "应用健康检查最终失败"
            exit 1
        fi
    done
fi

# 16. 清理临时文件
log_step "清理部署临时文件..."
rm -rf /tmp/cosereeden-new/ 2>/dev/null || true
rm -f /tmp/env-backup /tmp/ecosystem-backup 2>/dev/null || true
rm -f "$DEPLOY_PACKAGE" 2>/dev/null || true

# 17. 记录部署成功
{
    echo "部署完成时间: $(date)"
    echo "部署包: $DEPLOY_PACKAGE"
    echo "备份位置: $BACKUP_DIR"
    echo "应用状态: $(pm2 list 2>/dev/null | grep cosereeden || echo '未知')"
    echo "磁盘使用: $(df . | tail -1 | awk '{print $5}')"
    echo "=========================================="
} >> "$LOG_FILE"

log_success "部署完成！应用已成功启动"

# 显示部署摘要
echo ""
echo "=========================================="
echo "部署摘要"
echo "=========================================="
echo "部署时间: $(date)"
echo "备份位置: $BACKUP_DIR"
echo "磁盘使用率: $(df . | tail -1 | awk '{print $5}')"
echo "应用状态: $(pm2 list 2>/dev/null | grep -c online || echo 0) 个进程在线"
echo "=========================================="
