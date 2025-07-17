/**
 * @fileoverview 统一配置管理器
 * @description 统一管理所有环境变量，明确优先级
 */

export class UnifiedConfigManager {
  private static instance: UnifiedConfigManager;
  private configCache: Map<string, any> = new Map();
  private loadOrder: string[] = [];

  private constructor() {
    this.initializeLoadOrder();
    this.loadConfigurations();
  }

  public static getInstance(): UnifiedConfigManager {
    if (!UnifiedConfigManager.instance) {
      UnifiedConfigManager.instance = new UnifiedConfigManager();
    }
    return UnifiedConfigManager.instance;
  }

  /**
   * 初始化配置加载顺序
   */
  private initializeLoadOrder(): void {
    // 明确的配置优先级（从高到低）
    this.loadOrder = [
      'process.env',           // 1. 系统环境变量（最高优先级）
      '.env.local',           // 2. 本地覆盖配置
      '.env.production',      // 3. 生产环境配置
      '.env.development',     // 4. 开发环境配置  
      '.env'                  // 5. 基础配置（最低优先级）
    ];
  }

  /**
   * 加载所有配置
   */
  private loadConfigurations(): void {
    console.log('📋 配置加载顺序:', this.loadOrder);
    
    this.loadOrder.forEach((source, index) => {
      console.log(`${index + 1}. 加载 ${source}`);
    });
  }

  /**
   * 获取配置值（带优先级处理）
   */
  public getConfig(key: string, fallback?: any): any {
    // 优先级处理：COSEREEDEN_ 前缀 > 传统前缀
    const coseredenKey = key.startsWith('COSEREEDEN_') ? key : `COSEREEDEN_${key}`;
    
    // 1. 尝试获取COSEREEDEN_前缀版本
    let value = process.env[coseredenKey];
    
    // 2. 如果没有，尝试获取传统版本
    if (value === undefined) {
      value = process.env[key];
    }
    
    // 3. 如果都没有，使用fallback
    if (value === undefined) {
      value = fallback;
    }

    // 记录配置获取日志
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 配置获取: ${key} = ${value} (来源: ${coseredenKey in process.env ? coseredenKey : key})`);
    }

    return value;
  }

  /**
   * R2配置专用获取器（处理多前缀问题）
   */
  public getR2Config(key: string): string | undefined {
    const prefixes = [
      'COSEREEDEN_CLOUDFLARE_R2_',  // 最高优先级
      'CLOUDFLARE_R2_',             // 中等优先级
      'HARDCODED_R2_'               // 最低优先级（已废弃）
    ];

    for (const prefix of prefixes) {
      const fullKey = prefix + key;
      const value = process.env[fullKey];
      if (value !== undefined) {
        console.log(`🔑 R2配置: ${key} = ${value} (来源: ${fullKey})`);
        return value;
      }
    }

    return undefined;
  }

  /**
   * 检测配置冲突
   */
  public detectConflicts(): Array<{key: string, conflicts: string[]}> {
    const conflicts: Array<{key: string, conflicts: string[]}> = [];
    const checkedKeys = new Set<string>();

    Object.keys(process.env).forEach(key => {
      if (checkedKeys.has(key)) return;

      const baseName = key.replace(/^COSEREEDEN_/, '');
      const coseredenKey = `COSEREEDEN_${baseName}`;
      
      if (key !== coseredenKey && process.env[coseredenKey] !== undefined) {
        const conflictingKeys = [key, coseredenKey];
        const values = conflictingKeys.map(k => process.env[k]);
        
        if (new Set(values).size > 1) {
          conflicts.push({
            key: baseName,
            conflicts: conflictingKeys.map((k, i) => `${k}=${values[i]}`)
          });
        }

        conflictingKeys.forEach(k => checkedKeys.add(k));
      }
    });

    return conflicts;
  }

  /**
   * 验证必需配置
   */
  public validateRequiredConfigs(): boolean {
    const requiredConfigs = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL'
    ];

    const missing: string[] = [];

    requiredConfigs.forEach(key => {
      const value = this.getConfig(key);
      if (!value) {
        missing.push(key);
      }
    });

    if (missing.length > 0) {
      console.error('❌ 缺失必需配置:', missing);
      return false;
    }

    console.log('✅ 所有必需配置已设置');
    return true;
  }
}

// 导出单例实例
export const configManager = UnifiedConfigManager.getInstance();
export default configManager;