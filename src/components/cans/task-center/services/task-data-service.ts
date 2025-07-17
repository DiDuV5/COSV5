/**
 * @fileoverview 任务数据服务
 * @description 专门处理任务数据处理、过滤和统计逻辑
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

/**
 * 任务接口（匹配API返回的数据结构）
 */
export interface Task {
  type: string;
  name: string;
  title?: string; // API中可能使用title字段
  description: string;
  icon: string;
  category: string;
  difficulty: string;
  cansReward: number;
  experienceReward?: number;
  dailyLimit: number;
  completed: number;
  remaining?: number; // API返回的剩余次数
  progress: number;
  totalReward: number;
  status: 'available' | 'completed' | 'locked' | 'expired';
  isEnabled?: boolean; // API中的启用状态
  requirements?: string[];
  timeLimit?: number;
  cooldown?: number;
}

/**
 * 今日进度接口
 */
export interface TodayProgress {
  totalTasks: number;
  completedTasks: number;
  totalCansEarned: number;
  totalExperienceEarned: number;
  completionRate: number;
  streakDays: number;
}

/**
 * 分类统计接口
 */
export interface CategoryStats {
  total: number;
  completed: number;
  available: number;
  locked: number;
  completionRate: number;
}

/**
 * 任务过滤选项接口
 */
export interface TaskFilterOptions {
  category?: string;
  difficulty?: string;
  status?: string;
  showOnlyAvailable?: boolean;
  sortBy?: 'name' | 'difficulty' | 'reward' | 'progress';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 任务数据服务类
 */
export class TaskDataService {
  /**
   * 过滤任务列表
   */
  static filterTasks(tasks: Task[], options: TaskFilterOptions = {}): Task[] {
    const {
      category = 'all',
      difficulty,
      status,
      showOnlyAvailable = false,
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    let filteredTasks = [...tasks];

    // 按分类过滤
    if (category !== 'all') {
      filteredTasks = filteredTasks.filter(task => 
        (task.category || 'interaction') === category
      );
    }

    // 按难度过滤
    if (difficulty) {
      filteredTasks = filteredTasks.filter(task => task.difficulty === difficulty);
    }

    // 按状态过滤
    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }

    // 只显示可用任务
    if (showOnlyAvailable) {
      filteredTasks = filteredTasks.filter(task => task.status === 'available');
    }

    // 排序
    filteredTasks.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'difficulty':
          const difficultyOrder = { easy: 1, medium: 2, hard: 3, expert: 4 };
          comparison = (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0) - 
                      (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0);
          break;
        case 'reward':
          comparison = a.cansReward - b.cansReward;
          break;
        case 'progress':
          comparison = a.progress - b.progress;
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filteredTasks;
  }

  /**
   * 计算分类统计
   */
  static calculateCategoryStats(tasks: Task[]): Record<string, CategoryStats> {
    const stats: Record<string, CategoryStats> = {};

    tasks.forEach(task => {
      const category = task.category || 'interaction';
      
      if (!stats[category]) {
        stats[category] = {
          total: 0,
          completed: 0,
          available: 0,
          locked: 0,
          completionRate: 0,
        };
      }

      stats[category].total++;
      
      switch (task.status) {
        case 'completed':
          stats[category].completed++;
          break;
        case 'available':
          stats[category].available++;
          break;
        case 'locked':
          stats[category].locked++;
          break;
      }
    });

    // 计算完成率
    Object.keys(stats).forEach(category => {
      const categoryStats = stats[category];
      categoryStats.completionRate = categoryStats.total > 0 
        ? Math.round((categoryStats.completed / categoryStats.total) * 100)
        : 0;
    });

    return stats;
  }

  /**
   * 计算今日进度
   */
  static calculateTodayProgress(tasks: Task[]): TodayProgress {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const totalCansEarned = tasks
      .filter(task => task.status === 'completed')
      .reduce((sum, task) => sum + (task.cansReward * task.completed), 0);
    const totalExperienceEarned = tasks
      .filter(task => task.status === 'completed')
      .reduce((sum, task) => sum + ((task.experienceReward || 0) * task.completed), 0);
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      totalCansEarned,
      totalExperienceEarned,
      completionRate,
      streakDays: 0, // 需要从其他地方获取
    };
  }

  /**
   * 获取任务推荐
   */
  static getRecommendedTasks(tasks: Task[], limit: number = 3): Task[] {
    // 推荐逻辑：优先推荐可用的、奖励高的、简单的任务
    return tasks
      .filter(task => task.status === 'available')
      .sort((a, b) => {
        // 按难度和奖励排序
        const difficultyScore = { easy: 3, medium: 2, hard: 1, expert: 0 };
        const aScore = (difficultyScore[a.difficulty as keyof typeof difficultyScore] || 0) + 
                      (a.cansReward / 10);
        const bScore = (difficultyScore[b.difficulty as keyof typeof difficultyScore] || 0) + 
                      (b.cansReward / 10);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  /**
   * 检查任务是否可完成
   */
  static canCompleteTask(task: Task): {
    canComplete: boolean;
    reason?: string;
  } {
    if (task.status !== 'available') {
      return {
        canComplete: false,
        reason: '任务不可用',
      };
    }

    if (task.completed >= task.dailyLimit) {
      return {
        canComplete: false,
        reason: '今日完成次数已达上限',
      };
    }

    return { canComplete: true };
  }

  /**
   * 计算任务奖励
   */
  static calculateTaskReward(task: Task, completedCount: number = 1): {
    cansReward: number;
    experienceReward: number;
    totalReward: number;
  } {
    const maxCompletions = Math.min(completedCount, task.dailyLimit - task.completed);
    
    return {
      cansReward: task.cansReward * maxCompletions,
      experienceReward: (task.experienceReward || 0) * maxCompletions,
      totalReward: task.totalReward,
    };
  }

  /**
   * 获取任务完成建议
   */
  static getCompletionSuggestions(tasks: Task[]): string[] {
    const suggestions: string[] = [];
    const availableTasks = tasks.filter(task => task.status === 'available');
    
    if (availableTasks.length === 0) {
      suggestions.push('🎉 所有任务都已完成！明天再来看看新任务吧');
      return suggestions;
    }

    const easyTasks = availableTasks.filter(task => task.difficulty === 'easy');
    const highRewardTasks = availableTasks
      .sort((a, b) => b.cansReward - a.cansReward)
      .slice(0, 3);

    if (easyTasks.length > 0) {
      suggestions.push(`💡 建议先完成 ${easyTasks.length} 个简单任务快速获得奖励`);
    }

    if (highRewardTasks.length > 0) {
      suggestions.push(`💰 "${highRewardTasks[0].name}" 奖励最高，值得优先完成`);
    }

    const interactionTasks = availableTasks.filter(task => task.category === 'interaction');
    const creationTasks = availableTasks.filter(task => task.category === 'creation');

    if (interactionTasks.length > creationTasks.length) {
      suggestions.push('🤝 今天的互动任务比较多，多与其他用户互动吧');
    } else if (creationTasks.length > interactionTasks.length) {
      suggestions.push('🎨 今天的创作任务比较多，发挥你的创意吧');
    }

    return suggestions;
  }

  /**
   * 验证任务数据
   */
  static validateTask(task: Partial<Task>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!task.type) errors.push('任务类型不能为空');
    if (!task.name) errors.push('任务名称不能为空');
    if (!task.description) errors.push('任务描述不能为空');
    if (typeof task.cansReward !== 'number' || task.cansReward < 0) {
      errors.push('罐头奖励必须是非负数');
    }
    if (typeof task.dailyLimit !== 'number' || task.dailyLimit <= 0) {
      errors.push('每日限制必须是正数');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 格式化任务数据（处理API返回的数据）
   */
  static formatTaskForDisplay(task: any): Task {
    // 处理API返回的数据结构
    const completed = task.completed || 0;
    const dailyLimit = task.dailyLimit || 1;
    const progress = Math.min(100, Math.round((completed / dailyLimit) * 100));

    // 确定任务状态
    let status: Task['status'] = 'available';
    if (task.isEnabled === false) {
      status = 'locked';
    } else if (completed >= dailyLimit) {
      status = 'completed';
    } else if (task.status) {
      status = task.status;
    }

    return {
      type: task.type,
      name: task.title || task.name,
      title: task.title,
      description: task.description || '',
      icon: task.icon || 'target',
      category: task.category || 'interaction',
      difficulty: task.difficulty || 'easy',
      cansReward: task.cansReward || 0,
      experienceReward: task.experienceReward || 0,
      dailyLimit,
      completed,
      remaining: task.remaining || (dailyLimit - completed),
      progress,
      totalReward: (task.cansReward || 0) * dailyLimit,
      status,
      isEnabled: task.isEnabled !== false,
      requirements: task.requirements,
      timeLimit: task.timeLimit,
      cooldown: task.cooldown,
    };
  }
}

/**
 * 导出服务创建函数
 */
export const createTaskDataService = () => TaskDataService;
