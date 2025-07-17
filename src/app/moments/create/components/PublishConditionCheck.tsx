/**
 * @fileoverview 发布条件检查组件
 * @description 显示发布前的条件验证
 */

'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

import type { PublishConditionCheckProps, PublishConditionCheck } from '../types';
import { checkPublishConditions } from '../utils';

/**
 * @component PublishConditionCheck
 * @description 发布条件检查组件
 */
export function PublishConditionCheckComponent({ 
  permissionInfo, 
  dailyLimit, 
  content, 
  onCheckResult 
}: PublishConditionCheckProps) {
  // 计算检查结果
  const checkResult = checkPublishConditions(content, permissionInfo, dailyLimit);

  // 通知父组件检查结果
  useEffect(() => {
    onCheckResult(checkResult);
  }, [checkResult, onCheckResult]);

  return (
    <Card className="border-l-4 border-l-orange-400">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-orange-500" />
          发布条件检查
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-sm">
          {/* 内容长度检查 */}
          <ConditionItem
            label="内容长度"
            passed={checkResult.contentLengthValid}
            details={`${content.length}/${permissionInfo.momentMaxLength} 字符`}
          />

          {/* 发布次数检查 */}
          <ConditionItem
            label="今日发布次数"
            passed={checkResult.hasRemainingPublishes}
            details={dailyLimit.remaining === -1 ? '无限制' : `剩余 ${dailyLimit.remaining || 0} 次`}
          />

          {/* 内容要求检查 */}
          <ConditionItem
            label="内容要求"
            passed={checkResult.hasContent}
            details={checkResult.hasContent ? '内容已填写' : '请填写内容'}
          />
        </div>

        {/* 错误提示 */}
        {!checkResult.canPublish && (
          <ErrorSummary errors={checkResult.errors} />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * @component ConditionItem
 * @description 单个条件检查项
 */
function ConditionItem({ 
  label, 
  passed, 
  details 
}: { 
  label: string; 
  passed: boolean; 
  details: string; 
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}:</span>
      <div className="flex items-center gap-2">
        {passed ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
        <span className={`text-xs ${passed ? 'text-green-600' : 'text-red-600'}`}>
          {details}
        </span>
      </div>
    </div>
  );
}

/**
 * @component ErrorSummary
 * @description 错误信息汇总
 */
function ErrorSummary({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
      <p className="font-medium mb-1">发布条件不满足:</p>
      <ul className="space-y-1 list-disc list-inside">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @component SimplePublishCheck
 * @description 简化版发布检查组件
 */
export function SimplePublishCheck({ 
  canPublish, 
  errors 
}: { 
  canPublish: boolean; 
  errors: string[]; 
}) {
  if (canPublish) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span>可以发布</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-red-600">
        <XCircle className="w-4 h-4" />
        <span>发布条件不满足</span>
      </div>
      {errors.length > 0 && (
        <div className="text-xs text-red-500">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * @component PublishConditionBadge
 * @description 发布条件徽章组件
 */
export function PublishConditionBadge({ 
  checkResult 
}: { 
  checkResult: PublishConditionCheck; 
}) {
  const { canPublish, errors } = checkResult;

  if (canPublish) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
        <CheckCircle className="w-3 h-3" />
        <span>可发布</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
      <XCircle className="w-3 h-3" />
      <span>{errors.length} 个问题</span>
    </div>
  );
}

/**
 * @component PublishConditionSkeleton
 * @description 发布条件检查骨架屏
 */
export function PublishConditionSkeleton() {
  return (
    <Card className="border-l-4 border-l-gray-200 animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 bg-gray-200 rounded w-20" />
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
