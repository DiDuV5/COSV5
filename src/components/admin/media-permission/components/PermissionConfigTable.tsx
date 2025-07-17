/**
 * @fileoverview 权限配置表格组件
 * @description 显示和编辑用户等级的媒体权限配置
 */

"use client";

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  MediaPermissionForm,
  type PermissionOverview,
  getUserLevelConfig,
} from '../constants/user-level-configs';

export interface PermissionConfigTableProps {
  form: UseFormReturn<MediaPermissionForm>;
  permissionOverview?: {
    configs: any[];
    userStats: Record<string, number>;
  };
  showDebugInfo?: boolean;
}

/**
 * 权限配置表格组件
 */
export function PermissionConfigTable({
  form,
  permissionOverview,
  showDebugInfo = false,
}: PermissionConfigTableProps) {
  const configs = form.watch('configs');

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">用户等级</TableHead>
            <TableHead className="w-40">媒体访问比例</TableHead>
            <TableHead className="w-32">视频播放</TableHead>
            <TableHead className="w-32">受限预览</TableHead>
            <TableHead className="w-32">图片下载</TableHead>
            <TableHead>用户数量</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((config, index) => {
            const levelInfo = getUserLevelConfig(config.userLevel);
            const userCount = permissionOverview?.userStats?.[config.userLevel] || 0;
            
            return (
              <TableRow key={config.userLevel}>
                {/* 用户等级 */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: levelInfo?.color }}
                    />
                    <Badge variant="outline">
                      {levelInfo?.label}
                    </Badge>
                  </div>
                </TableCell>

                {/* 媒体访问比例 */}
                <TableCell>
                  <FormField
                    control={form.control}
                    name={`configs.${index}.mediaAccessPercentage`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                              max={100}
                              min={0}
                              step={5}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium w-12">
                              {field.value}%
                            </span>
                          </div>
                          <Progress value={field.value} className="h-1" />
                        </div>
                      </FormItem>
                    )}
                  />
                </TableCell>

                {/* 视频播放权限 */}
                <TableCell>
                  <FormField
                    control={form.control}
                    name={`configs.${index}.canPlayVideos`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                if (showDebugInfo) {
                                  console.log(`视频播放权限变更 - ${config.userLevel}: ${field.value} -> ${checked}`);
                                }
                                field.onChange(checked);
                              }}
                            />
                            {showDebugInfo && (
                              <span className="text-xs text-gray-500">
                                {field.value ? '开' : '关'}
                              </span>
                            )}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TableCell>

                {/* 受限预览权限 */}
                <TableCell>
                  <FormField
                    control={form.control}
                    name={`configs.${index}.canViewRestrictedPreview`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TableCell>

                {/* 图片下载权限 */}
                <TableCell>
                  <FormField
                    control={form.control}
                    name={`configs.${index}.canDownloadImages`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TableCell>

                {/* 用户数量 */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {userCount.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">用户</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
