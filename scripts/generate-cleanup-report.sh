#!/bin/bash

# CoserEden 清理报告生成器
# 生成详细的清理和部署报告

set -e

# 配置
PROJECT_DIR="/root/cosereeden6"
LOG_FILE="/var/log/cosereeden-cleanup.log"
DEPLOY_LOG="/var/log/cosereeden-deploy.log"
BACKUP_DIR="/root/backups"

# 颜色定义（用于终端输出）
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 生成报告
generate_report() {
    echo "# CoserEden 自动清理和部署报告"
    echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # 1. 系统信息
    echo "## 🖥️ 系统信息"
    echo ""
    echo "- **服务器**: $(hostname) ($(hostname -I | awk '{print $1}'))"
    echo "- **操作系统**: $(lsb_release -d 2>/dev/null | cut -f2 || uname -a)"
    echo "- **内核版本**: $(uname -r)"
    echo "- **运行时间**: $(uptime -p 2>/dev/null || uptime)"
    echo ""
    
    # 2. 磁盘使用情况
    echo "## 💾 磁盘使用情况"
    echo ""
    echo "```"
    df -h "$PROJECT_DIR" 2>/dev/null || df -h /
    echo "```"
    echo ""
    
    # 项目目录大小
    if [[ -d "$PROJECT_DIR" ]]; then
        local project_size=$(du -sh "$PROJECT_DIR" 2>/dev/null | cut -f1)
        echo "- **项目目录大小**: $project_size"
        
        # 各子目录大小
        echo "- **子目录大小分布**:"
        cd "$PROJECT_DIR"
        for dir in src scripts docs prisma public .next node_modules; do
            if [[ -d "$dir" ]]; then
                local size=$(du -sh "$dir" 2>/dev/null | cut -f1)
                echo "  - $dir: $size"
            fi
        done
    fi
    echo ""
    
    # 3. 内存使用情况
    echo "## 🧠 内存使用情况"
    echo ""
    echo "```"
    free -h
    echo "```"
    echo ""
    
    # 4. 进程状态
    echo "## 🔄 应用进程状态"
    echo ""
    if command -v pm2 >/dev/null 2>&1; then
        echo "### PM2 进程列表"
        echo "```"
        pm2 list 2>/dev/null || echo "PM2进程列表获取失败"
        echo "```"
        echo ""
        
        echo "### PM2 进程详情"
        echo "```"
        pm2 show cosereeden 2>/dev/null || echo "应用进程详情获取失败"
        echo "```"
    else
        echo "PM2未安装或不可用"
    fi
    echo ""
    
    # 5. 清理历史
    echo "## 🧹 清理历史"
    echo ""
    if [[ -f "$LOG_FILE" ]]; then
        echo "### 最近的清理记录"
        echo "```"
        tail -n 50 "$LOG_FILE" 2>/dev/null || echo "清理日志读取失败"
        echo "```"
        echo ""
        
        # 统计清理次数
        local cleanup_count=$(grep -c "CoserEden 自动清理开始" "$LOG_FILE" 2>/dev/null || echo 0)
        echo "- **总清理次数**: $cleanup_count"
        
        # 最后清理时间
        local last_cleanup=$(grep "CoserEden 自动清理开始" "$LOG_FILE" 2>/dev/null | tail -1 | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' || echo "未知")
        echo "- **最后清理时间**: $last_cleanup"
    else
        echo "暂无清理历史记录"
    fi
    echo ""
    
    # 6. 部署历史
    echo "## 🚀 部署历史"
    echo ""
    if [[ -f "$DEPLOY_LOG" ]]; then
        echo "### 最近的部署记录"
        echo "```"
        tail -n 30 "$DEPLOY_LOG" 2>/dev/null || echo "部署日志读取失败"
        echo "```"
        echo ""
        
        # 统计部署次数
        local deploy_count=$(grep -c "CoserEden 部署开始" "$DEPLOY_LOG" 2>/dev/null || echo 0)
        echo "- **总部署次数**: $deploy_count"
        
        # 最后部署时间
        local last_deploy=$(grep "CoserEden 部署开始" "$DEPLOY_LOG" 2>/dev/null | tail -1 | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' || echo "未知")
        echo "- **最后部署时间**: $last_deploy"
    else
        echo "暂无部署历史记录"
    fi
    echo ""
    
    # 7. 备份状态
    echo "## 💾 备份状态"
    echo ""
    if [[ -d "$BACKUP_DIR" ]]; then
        local backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "cosereeden-*" 2>/dev/null | wc -l)
        echo "- **备份总数**: $backup_count"
        
        if [[ $backup_count -gt 0 ]]; then
            echo "- **备份列表**:"
            find "$BACKUP_DIR" -maxdepth 1 -type d -name "cosereeden-*" -printf '%TY-%Tm-%Td %TH:%TM  %f  %s bytes\n' 2>/dev/null | sort -r | head -10 | while read -r line; do
                echo "  - $line"
            done
            
            # 备份总大小
            local backup_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
            echo "- **备份总大小**: $backup_size"
        fi
    else
        echo "备份目录不存在"
    fi
    echo ""
    
    # 8. 文件统计
    echo "## 📊 项目文件统计"
    echo ""
    if [[ -d "$PROJECT_DIR" ]]; then
        cd "$PROJECT_DIR"
        
        # 文件类型统计
        echo "### 文件类型分布"
        echo "```"
        find . -type f -not -path "./node_modules/*" -not -path "./.next/*" | \
            sed 's/.*\.//' | sort | uniq -c | sort -nr | head -10 2>/dev/null || echo "文件统计失败"
        echo "```"
        echo ""
        
        # 代码行数统计
        echo "### 代码统计"
        if command -v cloc >/dev/null 2>&1; then
            echo "```"
            cloc --exclude-dir=node_modules,.next,coverage . 2>/dev/null || echo "代码统计工具不可用"
            echo "```"
        else
            # 简单统计
            local ts_lines=$(find . -name "*.ts" -not -path "./node_modules/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo 0)
            local tsx_lines=$(find . -name "*.tsx" -not -path "./node_modules/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo 0)
            local js_lines=$(find . -name "*.js" -not -path "./node_modules/*" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo 0)
            
            echo "- **TypeScript文件**: $ts_lines 行"
            echo "- **TSX文件**: $tsx_lines 行"
            echo "- **JavaScript文件**: $js_lines 行"
        fi
    fi
    echo ""
    
    # 9. 网络状态
    echo "## 🌐 网络状态"
    echo ""
    if command -v curl >/dev/null 2>&1; then
        # 检查应用健康状态
        if curl -s --connect-timeout 5 http://localhost:3000/api/health >/dev/null 2>&1; then
            echo "- **应用状态**: ✅ 健康"
        else
            echo "- **应用状态**: ❌ 异常"
        fi
        
        # 检查端口监听
        local listening_ports=$(netstat -tlnp 2>/dev/null | grep :3000 | wc -l || echo 0)
        echo "- **端口3000监听**: $listening_ports 个进程"
    else
        echo "网络检查工具不可用"
    fi
    echo ""
    
    # 10. 安全检查
    echo "## 🔒 安全检查"
    echo ""
    
    # 检查敏感文件权限
    if [[ -f ".env.production" ]]; then
        local env_perms=$(stat -c "%a" .env.production 2>/dev/null || echo "未知")
        echo "- **.env.production 权限**: $env_perms"
    fi
    
    # 检查目录权限
    local dir_perms=$(stat -c "%a" . 2>/dev/null || echo "未知")
    echo "- **项目目录权限**: $dir_perms"
    
    # 检查运行用户
    local current_user=$(whoami)
    echo "- **运行用户**: $current_user"
    echo ""
    
    # 11. 建议和警告
    echo "## ⚠️ 建议和警告"
    echo ""
    
    # 磁盘空间警告
    local disk_usage=$(df "$PROJECT_DIR" 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//' || echo 0)
    if [[ $disk_usage -gt 80 ]]; then
        echo "- ⚠️ **磁盘使用率较高**: ${disk_usage}%，建议清理或扩容"
    fi
    
    # 内存使用警告
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [[ $memory_usage -gt 80 ]]; then
        echo "- ⚠️ **内存使用率较高**: ${memory_usage}%"
    fi
    
    # 备份数量检查
    if [[ -d "$BACKUP_DIR" ]]; then
        local backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "cosereeden-*" 2>/dev/null | wc -l)
        if [[ $backup_count -gt 5 ]]; then
            echo "- ⚠️ **备份文件过多**: $backup_count 个，建议清理旧备份"
        fi
    fi
    
    echo ""
    echo "---"
    echo "*报告生成完成于 $(date '+%Y-%m-%d %H:%M:%S')*"
}

# 主函数
main() {
    # 检查项目目录
    if [[ ! -d "$PROJECT_DIR" ]]; then
        echo "错误: 项目目录不存在 $PROJECT_DIR" >&2
        exit 1
    fi
    
    # 生成报告
    generate_report
}

# 执行主函数
main "$@"
