/**
 * @fileoverview 配置变更历史管理器
 * @description 管理配置变更记录和历史追踪
 * @author Augment AI
 * @date 2025-07-08
 * @version 2.0.0 - 重构版（模块化架构）
 */

import type { 
  ConfigChangeRecord, 
  ChangeHistoryStats, 
  DocGenerationConfig,
  ConfigChangeType 
} from './doc-types';

/**
 * 配置变更历史管理器
 */
export class ChangeHistoryManager {
  private changeHistory: ConfigChangeRecord[] = [];

  /**
   * 记录配置变更
   */
  recordConfigChange(change: Omit<ConfigChangeRecord, 'timestamp'>): void {
    this.changeHistory.push({
      ...change,
      timestamp: Date.now(),
    });
  }

  /**
   * 获取变更历史
   */
  getChangeHistory(): ConfigChangeRecord[] {
    return [...this.changeHistory];
  }

  /**
   * 清除变更历史
   */
  clearChangeHistory(): void {
    this.changeHistory = [];
  }

  /**
   * 生成变更历史文档
   */
  generateChangeHistoryDoc(config: DocGenerationConfig): string[] {
    const content: string[] = [];

    content.push('# CoserEden 配置变更历史');
    content.push('');
    content.push(`> 生成时间: ${new Date().toISOString()}`);
    content.push('');
    content.push('本文档记录了CoserEden项目配置的重要变更。');
    content.push('');

    if (this.changeHistory.length === 0) {
      content.push('暂无配置变更记录。');
      return content;
    }

    // 生成统计信息
    const stats = this.getChangeHistoryStats();
    content.push('## 变更统计');
    content.push('');
    content.push(`**总变更数**: ${stats.totalChanges}`);
    content.push(`**最近30天变更**: ${stats.recentChanges.length}`);
    content.push('');

    content.push('### 按类型分布');
    content.push('');
    for (const [type, count] of Object.entries(stats.changesByType)) {
      content.push(`- ${this.getChangeTypeText(type as ConfigChangeType)}: ${count}`);
    }
    content.push('');

    content.push('### 按类别分布');
    content.push('');
    for (const [category, count] of Object.entries(stats.changesByCategory)) {
      content.push(`- ${category}: ${count}`);
    }
    content.push('');

    // 按时间倒序排列变更记录
    const sortedHistory = this.changeHistory.sort((a, b) => b.timestamp - a.timestamp);
    
    content.push('## 变更记录');
    content.push('');

    // 按版本分组
    const versionGroups = this.groupChangesByVersion(sortedHistory);
    
    for (const [version, changes] of Object.entries(versionGroups)) {
      const latestChange = changes[0];
      const date = new Date(latestChange.timestamp).toISOString().split('T')[0];
      
      content.push(`### ${version} (${date})`);
      content.push('');

      // 按变更类型分组
      const typeGroups = this.groupChangesByType(changes);
      
      for (const [type, typeChanges] of Object.entries(typeGroups)) {
        if (typeChanges.length === 0) continue;
        
        content.push(`#### ${this.getChangeTypeEmoji(type as ConfigChangeType)} ${this.getChangeTypeText(type as ConfigChangeType)}`);
        content.push('');
        
        for (const change of typeChanges) {
          content.push(`- **${change.variable}** (${change.category})`);
          content.push(`  - ${change.description}`);
          
          if (change.oldValue && change.newValue) {
            content.push(`  - 变更: \`${this.maskSensitiveValue(change.variable, change.oldValue)}\` → \`${this.maskSensitiveValue(change.variable, change.newValue)}\``);
          }
          
          if (change.author) {
            content.push(`  - 作者: ${change.author}`);
          }
          
          content.push('');
        }
      }
    }

    return content;
  }

  /**
   * 获取变更历史统计
   */
  getChangeHistoryStats(): ChangeHistoryStats {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    const recentChanges = this.changeHistory.filter(change => change.timestamp >= thirtyDaysAgo);
    
    const changesByType: Record<string, number> = {};
    const changesByCategory: Record<string, number> = {};
    
    for (const change of this.changeHistory) {
      changesByType[change.changeType] = (changesByType[change.changeType] || 0) + 1;
      changesByCategory[change.category] = (changesByCategory[change.category] || 0) + 1;
    }
    
    const mostActiveCategories = Object.entries(changesByCategory)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalChanges: this.changeHistory.length,
      changesByType,
      changesByCategory,
      recentChanges,
      mostActiveCategories,
    };
  }

  /**
   * 按版本分组变更
   */
  private groupChangesByVersion(changes: ConfigChangeRecord[]): Record<string, ConfigChangeRecord[]> {
    return changes.reduce((groups, change) => {
      const version = change.version;
      if (!groups[version]) {
        groups[version] = [];
      }
      groups[version].push(change);
      return groups;
    }, {} as Record<string, ConfigChangeRecord[]>);
  }

  /**
   * 按变更类型分组
   */
  private groupChangesByType(changes: ConfigChangeRecord[]): Record<string, ConfigChangeRecord[]> {
    return changes.reduce((groups, change) => {
      const type = change.changeType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(change);
      return groups;
    }, {} as Record<string, ConfigChangeRecord[]>);
  }

  /**
   * 获取变更类型文本
   */
  private getChangeTypeText(type: ConfigChangeType): string {
    const texts: Record<ConfigChangeType, string> = {
      'added': '新增',
      'modified': '修改',
      'removed': '删除',
      'deprecated': '废弃',
    };
    return texts[type] || '未知';
  }

  /**
   * 获取变更类型表情符号
   */
  private getChangeTypeEmoji(type: ConfigChangeType): string {
    const emojis: Record<ConfigChangeType, string> = {
      'added': '➕',
      'modified': '🔄',
      'removed': '➖',
      'deprecated': '⚠️',
    };
    return emojis[type] || '❓';
  }

  /**
   * 掩码敏感值
   */
  private maskSensitiveValue(variable: string, value: string): string {
    const sensitiveKeywords = ['password', 'secret', 'key', 'token'];
    const isSensitive = sensitiveKeywords.some(keyword => 
      variable.toLowerCase().includes(keyword)
    );
    
    if (isSensitive) {
      if (value.length <= 4) {
        return '***';
      }
      return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
    }
    
    return value;
  }

  /**
   * 导入变更历史
   */
  importChangeHistory(history: ConfigChangeRecord[]): void {
    this.changeHistory = [...history];
  }

  /**
   * 导出变更历史
   */
  exportChangeHistory(): ConfigChangeRecord[] {
    return [...this.changeHistory];
  }

  /**
   * 搜索变更记录
   */
  searchChanges(criteria: {
    variable?: string;
    category?: string;
    changeType?: ConfigChangeType;
    author?: string;
    fromDate?: Date;
    toDate?: Date;
  }): ConfigChangeRecord[] {
    return this.changeHistory.filter(change => {
      if (criteria.variable && !change.variable.includes(criteria.variable)) {
        return false;
      }
      
      if (criteria.category && change.category !== criteria.category) {
        return false;
      }
      
      if (criteria.changeType && change.changeType !== criteria.changeType) {
        return false;
      }
      
      if (criteria.author && change.author !== criteria.author) {
        return false;
      }
      
      if (criteria.fromDate && change.timestamp < criteria.fromDate.getTime()) {
        return false;
      }
      
      if (criteria.toDate && change.timestamp > criteria.toDate.getTime()) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * 获取最近的变更
   */
  getRecentChanges(limit: number = 10): ConfigChangeRecord[] {
    return this.changeHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * 获取特定类别的变更
   */
  getChangesByCategory(category: string): ConfigChangeRecord[] {
    return this.changeHistory.filter(change => change.category === category);
  }

  /**
   * 获取特定变量的变更历史
   */
  getVariableHistory(variable: string): ConfigChangeRecord[] {
    return this.changeHistory
      .filter(change => change.variable === variable)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}
