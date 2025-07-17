/**
 * @fileoverview 高级设置面板组件
 * @description 提供上传系统的高级配置选项
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

import React from 'react';
import type { AdvancedSettingsPanelProps } from '../types';

export function AdvancedSettingsPanel({ config, onConfigChange }: AdvancedSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-lg font-medium">上传策略</h4>

          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.autoStrategy}
                onChange={(e) => onConfigChange({ autoStrategy: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">自动选择最优策略</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.enableResume}
                onChange={(e) => onConfigChange({ enableResume: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">启用断点续传</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">最大并发数</label>
            <input
              type="range"
              min="1"
              max="10"
              value={config.maxConcurrent}
              onChange={(e) => onConfigChange({ maxConcurrent: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{config.maxConcurrent} 个文件</span>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-medium">性能设置</h4>

          <div className="space-y-2">
            <label className="text-sm font-medium">分片大小</label>
            <select
              value={config.chunkSize}
              onChange={(e) => onConfigChange({ chunkSize: parseInt(e.target.value) })}
              className="w-full p-2 border rounded"
            >
              <option value={1024 * 1024}>1MB</option>
              <option value={5 * 1024 * 1024}>5MB</option>
              <option value={10 * 1024 * 1024}>10MB</option>
              <option value={20 * 1024 * 1024}>20MB</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">最大重试次数</label>
            <input
              type="number"
              min="0"
              max="10"
              value={config.maxRetries}
              onChange={(e) => onConfigChange({ maxRetries: parseInt(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-medium text-blue-800 mb-2">策略说明</h5>
        <div className="space-y-1 text-xs text-blue-700">
          <p><strong>直接上传:</strong> 适用于小文件（&lt;10MB），速度最快</p>
          <p><strong>分片上传:</strong> 适用于大文件（&gt;50MB），支持断点续传</p>
          <p><strong>流式上传:</strong> 适用于超大视频文件（&gt;100MB），内存友好</p>
          <p><strong>混合策略:</strong> 根据文件类型和大小自动选择最优方案</p>
        </div>
      </div>
    </div>
  );
}
