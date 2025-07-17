/**
 * @fileoverview 瀑布流布局计算器
 * @description 处理瀑布流布局的计算逻辑，从原 HighPerformanceMasonryGrid.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

export interface MediaItem {
  id: string;
  url: string;
  cdnUrl?: string | null;
  thumbnailUrl?: string | null;
  filename?: string | null;
  originalName: string;
  mediaType: string;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  isPublic?: boolean | null;
}

export interface LayoutPosition {
  item: MediaItem;
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

export interface LayoutResult {
  positions: LayoutPosition[];
  totalHeight: number;
}

export interface LayoutConfig {
  columnCount: number;
  columnWidth: number;
  gap: number;
}

/**
 * 瀑布流布局计算器类
 * 负责处理瀑布流布局的所有计算逻辑
 */
export class MasonryLayoutCalculator {
  /**
   * 计算响应式列数和列宽
   */
  public static calculateLayout(containerWidth: number): LayoutConfig {
    if (containerWidth === 0) {
      return { columnCount: 2, columnWidth: 150, gap: 16 };
    }

    const gap = 16;
    let columns: number;

    // 响应式列数计算
    if (containerWidth < 640) {
      columns = 2; // 移动端
    } else if (containerWidth < 768) {
      columns = 3; // 小平板
    } else if (containerWidth < 1024) {
      columns = 4; // 大平板
    } else if (containerWidth < 1280) {
      columns = 5; // 小桌面
    } else {
      columns = 6; // 大桌面
    }

    const totalGap = gap * (columns - 1);
    const availableWidth = containerWidth - totalGap;
    const width = Math.floor(availableWidth / columns);

    return { columnCount: columns, columnWidth: width, gap };
  }

  /**
   * 计算媒体项高度
   */
  public static calculateItemHeight(item: MediaItem, columnWidth: number): number {
    // 保持原始宽高比
    if (item.width && item.height && item.width > 0) {
      return Math.floor((item.height / item.width) * columnWidth);
    }

    // 默认高度
    const isVideo = this.isValidMediaType(item.mediaType) && item.mediaType === 'VIDEO';
    return isVideo
      ? Math.floor(columnWidth * 0.75) // 视频 4:3 比例
      : Math.floor(columnWidth * 1.2); // 图片稍高
  }

  /**
   * 计算瀑布流布局
   */
  public static calculateMasonryLayout(
    media: MediaItem[],
    config: LayoutConfig
  ): LayoutResult {
    const { columnCount, columnWidth, gap } = config;

    if (columnCount === 0 || columnWidth === 0 || !media.length) {
      return { positions: [], totalHeight: 200 };
    }

    const columnHeights = new Array(columnCount).fill(0);
    const positions: LayoutPosition[] = [];

    media.forEach((item, index) => {
      // 找到最短的列
      const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
      const height = this.calculateItemHeight(item, columnWidth);

      const x = shortestColumnIndex * (columnWidth + gap);
      const y = columnHeights[shortestColumnIndex];

      positions.push({
        item,
        x,
        y,
        width: columnWidth,
        height,
        index,
      });

      // 更新列高度
      columnHeights[shortestColumnIndex] += height + gap;
    });

    const totalHeight = Math.max(...columnHeights);
    return { positions, totalHeight };
  }

  /**
   * 类型守卫函数：验证媒体类型
   */
  public static isValidMediaType(mediaType: string): mediaType is 'IMAGE' | 'VIDEO' {
    return mediaType === 'IMAGE' || mediaType === 'VIDEO';
  }

  /**
   * 获取媒体类型显示名称
   */
  public static getMediaTypeDisplayName(mediaType: string): string {
    if (this.isValidMediaType(mediaType)) {
      return mediaType === 'VIDEO' ? '视频' : '图片';
    }
    return '未知';
  }

  /**
   * 检查是否为视频类型
   */
  public static isVideoType(mediaType: string): boolean {
    return this.isValidMediaType(mediaType) && mediaType === 'VIDEO';
  }

  /**
   * 检查是否为图片类型
   */
  public static isImageType(mediaType: string): boolean {
    return this.isValidMediaType(mediaType) && mediaType === 'IMAGE';
  }

  /**
   * 计算网格的最小高度
   */
  public static calculateMinHeight(itemCount: number, config: LayoutConfig): number {
    if (itemCount === 0) return 200;

    const { columnCount, columnWidth } = config;
    const itemsPerColumn = Math.ceil(itemCount / columnCount);
    const averageItemHeight = columnWidth * 1.2; // 假设平均高度

    return itemsPerColumn * (averageItemHeight + config.gap);
  }

  /**
   * 获取指定位置的媒体项
   */
  public static getItemAtPosition(
    positions: LayoutPosition[],
    x: number,
    y: number
  ): LayoutPosition | null {
    return positions.find(pos =>
      x >= pos.x &&
      x <= pos.x + pos.width &&
      y >= pos.y &&
      y <= pos.y + pos.height
    ) || null;
  }

  /**
   * 获取可见区域内的媒体项
   */
  public static getVisibleItems(
    positions: LayoutPosition[],
    scrollTop: number,
    viewportHeight: number,
    buffer: number = 200
  ): LayoutPosition[] {
    const visibleTop = scrollTop - buffer;
    const visibleBottom = scrollTop + viewportHeight + buffer;

    return positions.filter(pos =>
      pos.y + pos.height >= visibleTop &&
      pos.y <= visibleBottom
    );
  }

  /**
   * 计算布局性能指标
   */
  public static calculateLayoutMetrics(
    positions: LayoutPosition[],
    config: LayoutConfig
  ): {
    totalItems: number;
    averageHeight: number;
    columnBalance: number;
    efficiency: number;
  } {
    const { columnCount, columnWidth, gap } = config;

    if (positions.length === 0) {
      return {
        totalItems: 0,
        averageHeight: 0,
        columnBalance: 1,
        efficiency: 0,
      };
    }

    // 计算每列的高度
    const columnHeights = new Array(columnCount).fill(0);
    positions.forEach(pos => {
      const columnIndex = Math.floor(pos.x / (columnWidth + gap));
      if (columnIndex < columnCount) {
        columnHeights[columnIndex] = Math.max(
          columnHeights[columnIndex],
          pos.y + pos.height
        );
      }
    });

    const maxHeight = Math.max(...columnHeights);
    const minHeight = Math.min(...columnHeights);
    const averageHeight = columnHeights.reduce((sum, h) => sum + h, 0) / columnCount;

    // 列平衡度 (0-1，1表示完全平衡)
    const columnBalance = minHeight / maxHeight;

    // 布局效率 (空间利用率)
    const totalArea = maxHeight * (columnCount * columnWidth + (columnCount - 1) * gap);
    const usedArea = positions.reduce((sum, pos) => sum + pos.width * pos.height, 0);
    const efficiency = usedArea / totalArea;

    return {
      totalItems: positions.length,
      averageHeight,
      columnBalance,
      efficiency,
    };
  }
}

/**
 * 导出布局计算器实例
 */
export const layoutCalculator = MasonryLayoutCalculator;
