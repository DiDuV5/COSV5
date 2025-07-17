#!/bin/bash

# CoserEden 生产环境自动清理脚本
# 用于CI/CD流程中的自动化清理

set -e

# 参数
CLEANUP_MODE="${1:-auto}"  # auto, force, skip
COMMIT_SHA="${2:-unknown}"
BUILD_NUMBER="${3:-0}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
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
BACKUP_BASE_DIR="/root/backups"
LOG_FILE="/var/log/cosereeden-cleanup.log"
MAX_BACKUPS=3

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")"

# 记录开始
{
    echo "=========================================="
    echo "CoserEden 自动清理开始"
    echo "时间: $(date)"
    echo "模式: $CLEANUP_MODE"
    echo "提交: $COMMIT_SHA"
    echo "构建: $BUILD_NUMBER"
    echo "=========================================="
} >> "$LOG_FILE"

log_step "开始生产环境自动清理 (模式: $CLEANUP_MODE)"

# 检查项目目录
if [[ ! -d "$PROJECT_DIR" ]]; then
    log_error "项目目录不存在: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# 1. 创建备份
create_backup() {
    log_step "创建部署前备份..."
    
    local backup_dir="$BACKUP_BASE_DIR/cosereeden-$(date +%Y%m%d-%H%M%S)-build$BUILD_NUMBER"
    mkdir -p "$backup_dir"
    
    # 备份关键文件和配置
    cp -r .env* "$backup_dir/" 2>/dev/null || true
    cp -r ecosystem.config.js "$backup_dir/" 2>/dev/null || true
    cp -r package.json "$backup_dir/" 2>/dev/null || true
    cp -r prisma/ "$backup_dir/" 2>/dev/null || true
    
    # 备份当前运行状态
    pm2 list > "$backup_dir/pm2-status.txt" 2>/dev/null || true
    
    log_success "备份创建完成: $backup_dir"
    echo "$backup_dir" > /tmp/latest-backup-path
}

# 2. 清理构建产物
cleanup_build_artifacts() {
    log_step "清理构建产物..."
    
    local cleaned_size=0
    
    # 清理Next.js构建产物
    if [[ -d ".next" ]]; then
        local size=$(du -sb .next 2>/dev/null | cut -f1 || echo 0)
        rm -rf .next/
        cleaned_size=$((cleaned_size + size))
        log_info "已清理 .next/ 目录 ($(numfmt --to=iec $size))"
    fi
    
    # 清理测试覆盖率报告
    if [[ -d "coverage" ]]; then
        local size=$(du -sb coverage 2>/dev/null | cut -f1 || echo 0)
        rm -rf coverage/
        cleaned_size=$((cleaned_size + size))
        log_info "已清理 coverage/ 目录 ($(numfmt --to=iec $size))"
    fi
    
    # 清理其他构建目录
    for dir in dist build out; do
        if [[ -d "$dir" ]]; then
            local size=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo 0)
            rm -rf "$dir/"
            cleaned_size=$((cleaned_size + size))
            log_info "已清理 $dir/ 目录 ($(numfmt --to=iec $size))"
        fi
    done
    
    log_success "构建产物清理完成，释放空间: $(numfmt --to=iec $cleaned_size)"
}

# 3. 清理临时文件
cleanup_temp_files() {
    log_step "清理临时文件..."
    
    local file_count=0
    local cleaned_size=0
    
    # 清理日志文件
    while IFS= read -r -d '' file; do
        local size=$(stat -c%s "$file" 2>/dev/null || echo 0)
        rm -f "$file"
        file_count=$((file_count + 1))
        cleaned_size=$((cleaned_size + size))
    done < <(find . -name "*.log" -not -path "./node_modules/*" -print0 2>/dev/null)
    
    # 清理临时文件
    for pattern in "*.tmp" "*.bak" "*.old" "*.backup" "*.cache" "*~"; do
        while IFS= read -r -d '' file; do
            local size=$(stat -c%s "$file" 2>/dev/null || echo 0)
            rm -f "$file"
            file_count=$((file_count + 1))
            cleaned_size=$((cleaned_size + size))
        done < <(find . -name "$pattern" -not -path "./node_modules/*" -print0 2>/dev/null)
    done
    
    # 清理临时目录
    for dir in temp tmp uploads backups; do
        if [[ -d "$dir" ]]; then
            local size=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo 0)
            rm -rf "$dir/"
            cleaned_size=$((cleaned_size + size))
            log_info "已清理 $dir/ 目录 ($(numfmt --to=iec $size))"
        fi
    done
    
    log_success "临时文件清理完成: $file_count 个文件，释放空间: $(numfmt --to=iec $cleaned_size)"
}

# 4. 清理PM2日志
cleanup_pm2_logs() {
    log_step "清理PM2日志..."
    
    # 获取PM2日志大小
    local log_size=0
    if command -v pm2 >/dev/null 2>&1; then
        log_size=$(pm2 logs --lines 0 --raw 2>/dev/null | wc -c || echo 0)
        pm2 flush 2>/dev/null || log_warning "PM2日志清理失败"
        log_success "PM2日志清理完成，释放空间: $(numfmt --to=iec $log_size)"
    else
        log_warning "PM2未安装，跳过PM2日志清理"
    fi
}

# 5. 清理过期备份
cleanup_old_backups() {
    log_step "清理过期备份..."
    
    if [[ -d "$BACKUP_BASE_DIR" ]]; then
        local backup_count=$(find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -name "cosereeden-*" | wc -l)
        
        if [[ $backup_count -gt $MAX_BACKUPS ]]; then
            local to_remove=$((backup_count - MAX_BACKUPS))
            find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -name "cosereeden-*" -printf '%T@ %p\n' | \
                sort -n | head -n "$to_remove" | cut -d' ' -f2- | \
                while read -r backup_dir; do
                    local size=$(du -sb "$backup_dir" 2>/dev/null | cut -f1 || echo 0)
                    rm -rf "$backup_dir"
                    log_info "已删除过期备份: $(basename "$backup_dir") ($(numfmt --to=iec $size))"
                done
            
            log_success "过期备份清理完成，保留最新 $MAX_BACKUPS 个备份"
        else
            log_info "备份数量 ($backup_count) 未超过限制 ($MAX_BACKUPS)，无需清理"
        fi
    fi
}

# 6. 系统缓存清理
cleanup_system_cache() {
    if [[ "$CLEANUP_MODE" == "force" ]]; then
        log_step "清理系统缓存..."
        
        sync
        echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || log_warning "系统缓存清理失败"
        
        log_success "系统缓存清理完成"
    fi
}

# 主清理流程
main() {
    local start_time=$(date +%s)
    local start_disk_usage=$(df "$PROJECT_DIR" | tail -1 | awk '{print $3}')
    
    # 执行清理步骤
    create_backup
    cleanup_build_artifacts
    cleanup_temp_files
    cleanup_pm2_logs
    cleanup_old_backups
    cleanup_system_cache
    
    # 计算清理效果
    local end_time=$(date +%s)
    local end_disk_usage=$(df "$PROJECT_DIR" | tail -1 | awk '{print $3}')
    local duration=$((end_time - start_time))
    local space_freed=$((start_disk_usage - end_disk_usage))
    
    # 记录结果
    {
        echo "清理完成时间: $(date)"
        echo "清理耗时: ${duration}秒"
        echo "释放空间: $(numfmt --to=iec $((space_freed * 1024)))"
        echo "当前磁盘使用率: $(df "$PROJECT_DIR" | tail -1 | awk '{print $5}')"
        echo "=========================================="
    } >> "$LOG_FILE"
    
    log_success "自动清理完成！耗时: ${duration}秒，释放空间: $(numfmt --to=iec $((space_freed * 1024)))"
}

# 执行主流程
main "$@"
