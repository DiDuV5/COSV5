/**
 * @fileoverview 工作流程指示器组件
 * @description 显示创作流程的进度和状态
 */

'use client';

interface WorkflowIndicatorProps {
  activeTab: string;
  title: string;
  content: string;
  uploadedFilesCount: number;
}

export function WorkflowIndicator({ 
  activeTab, 
  title, 
  content, 
  uploadedFilesCount 
}: WorkflowIndicatorProps) {
  return (
    <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
      <div className="flex items-center space-x-2 text-sm">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            activeTab === 'content' 
              ? 'bg-blue-500' 
              : (title || content) 
                ? 'bg-green-500' 
                : 'bg-gray-300'
          }`}></div>
          <span className={
            activeTab === 'content' 
              ? 'text-blue-700 font-medium' 
              : (title || content) 
                ? 'text-green-700' 
                : 'text-gray-500'
          }>
            作品信息
          </span>
        </div>
        <div className="w-4 h-px bg-gray-300"></div>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            activeTab === 'media' 
              ? 'bg-blue-500' 
              : uploadedFilesCount > 0 
                ? 'bg-green-500' 
                : 'bg-gray-300'
          }`}></div>
          <span className={
            activeTab === 'media' 
              ? 'text-blue-700 font-medium' 
              : uploadedFilesCount > 0 
                ? 'text-green-700' 
                : 'text-gray-500'
          }>
            媒体素材
          </span>
        </div>
        <div className="w-4 h-px bg-gray-300"></div>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            (uploadedFilesCount > 0 && title) 
              ? 'bg-green-500' 
              : 'bg-gray-300'
          }`}></div>
          <span className={
            (uploadedFilesCount > 0 && title) 
              ? 'text-green-700' 
              : 'text-gray-500'
          }>
            准备发布
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-1">
        {activeTab === 'content'
          ? '填写作品信息，让更多人发现您的创作'
          : '上传您的精彩作品，支持批量处理200-500张图片'
        }
      </p>
    </div>
  );
}
