#!/bin/bash

# CoserEden 清理验证脚本
# 验证自动清理是否正确执行，确保没有误删重要文件

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${BLUE}[VERIFY]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# 验证计数器
CHECKS_TOTAL=0
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNINGS=0

# 验证函数
verify_check() {
    local description="$1"
    local condition="$2"
    
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    
    if eval "$condition"; then
        log_success "$description"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    else
        log_error "$description"
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
        return 1
    fi
}

verify_warning() {
    local description="$1"
    local condition="$2"
    
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    
    if eval "$condition"; then
        log_warning "$description"
        CHECKS_WARNINGS=$((CHECKS_WARNINGS + 1))
        return 1
    else
        log_success "$description"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        return 0
    fi
}

log_info "开始验证清理结果..."

# 1. 验证关键文件存在
log_info "验证关键文件完整性..."
verify_check "package.json 存在" "[[ -f 'package.json' ]]"
verify_check "next.config.js 存在" "[[ -f 'next.config.js' ]]"
verify_check "tsconfig.json 存在" "[[ -f 'tsconfig.json' ]]"
verify_check "prisma/schema.prisma 存在" "[[ -f 'prisma/schema.prisma' ]]"
verify_check "src/ 目录存在" "[[ -d 'src' ]]"

# 2. 验证环境配置文件
log_info "验证环境配置..."
verify_check ".env.production 存在" "[[ -f '.env.production' ]]"
verify_check "ecosystem.config.js 存在" "[[ -f 'ecosystem.config.js' ]]"

# 3. 验证临时文件已清理
log_info "验证临时文件清理..."
verify_warning "无 .next/ 目录" "[[ -d '.next' ]]"
verify_warning "无 coverage/ 目录" "[[ -d 'coverage' ]]"
verify_warning "无 temp/ 目录" "[[ -d 'temp' ]]"
verify_warning "无 uploads/ 目录" "[[ -d 'uploads' ]]"
verify_warning "无 backups/ 目录" "[[ -d 'backups' ]]"

# 4. 验证日志文件清理
log_info "验证日志文件清理..."
LOG_COUNT=$(find . -name "*.log" -not -path "./node_modules/*" | wc -l)
verify_warning "项目目录无日志文件 (发现 $LOG_COUNT 个)" "[[ $LOG_COUNT -gt 0 ]]"

# 5. 验证临时文件清理
log_info "验证临时文件清理..."
TEMP_COUNT=$(find . \( -name "*.tmp" -o -name "*.bak" -o -name "*.old" \) -not -path "./node_modules/*" | wc -l)
verify_warning "无临时文件 (发现 $TEMP_COUNT 个)" "[[ $TEMP_COUNT -gt 0 ]]"

# 6. 验证磁盘空间
log_info "验证磁盘空间..."
DISK_USAGE=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
verify_check "磁盘使用率低于90% (当前: ${DISK_USAGE}%)" "[[ $DISK_USAGE -lt 90 ]]"

if [[ $DISK_USAGE -gt 80 ]]; then
    log_warning "磁盘使用率较高: ${DISK_USAGE}%"
fi

# 7. 验证权限
log_info "验证文件权限..."
verify_check "项目目录可读写" "[[ -r . && -w . ]]"
verify_check "package.json 可读" "[[ -r 'package.json' ]]"

# 8. 验证备份
log_info "验证备份完整性..."
BACKUP_DIR="/root/backups"
if [[ -d "$BACKUP_DIR" ]]; then
    BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "cosereeden-*" | wc -l)
    verify_check "存在备份文件 (发现 $BACKUP_COUNT 个)" "[[ $BACKUP_COUNT -gt 0 ]]"
    verify_check "备份数量合理 (≤3个)" "[[ $BACKUP_COUNT -le 3 ]]"
    
    # 检查最新备份
    LATEST_BACKUP=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "cosereeden-*" -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [[ -n "$LATEST_BACKUP" ]]; then
        verify_check "最新备份包含 package.json" "[[ -f '$LATEST_BACKUP/package.json' ]]"
        verify_check "最新备份包含 .env 文件" "[[ -f '$LATEST_BACKUP/.env.production' || -f '$LATEST_BACKUP/.env' ]]"
    fi
else
    log_warning "备份目录不存在: $BACKUP_DIR"
fi

# 9. 验证进程状态
log_info "验证进程状态..."
if command -v pm2 >/dev/null 2>&1; then
    PM2_STATUS=$(pm2 list | grep -c "online" || echo 0)
    log_info "PM2进程状态: $PM2_STATUS 个在线进程"
else
    log_warning "PM2未安装或不可用"
fi

# 10. 验证网络连接
log_info "验证网络连接..."
if command -v curl >/dev/null 2>&1; then
    if curl -s --connect-timeout 5 http://localhost:3000/api/health >/dev/null 2>&1; then
        log_success "应用健康检查通过"
    else
        log_warning "应用健康检查失败或应用未启动"
    fi
else
    log_warning "curl未安装，跳过网络检查"
fi

# 生成验证报告
echo ""
echo "=========================================="
echo "清理验证报告"
echo "=========================================="
echo "总检查项: $CHECKS_TOTAL"
echo "通过: $CHECKS_PASSED"
echo "失败: $CHECKS_FAILED"
echo "警告: $CHECKS_WARNINGS"
echo ""

# 计算成功率
if [[ $CHECKS_TOTAL -gt 0 ]]; then
    SUCCESS_RATE=$(( (CHECKS_PASSED * 100) / CHECKS_TOTAL ))
    echo "成功率: ${SUCCESS_RATE}%"
    
    if [[ $SUCCESS_RATE -ge 90 ]]; then
        log_success "清理验证整体通过！"
        exit 0
    elif [[ $SUCCESS_RATE -ge 70 ]]; then
        log_warning "清理验证基本通过，但有一些问题需要关注"
        exit 0
    else
        log_error "清理验证失败，存在严重问题！"
        exit 1
    fi
else
    log_error "没有执行任何验证检查"
    exit 1
fi
