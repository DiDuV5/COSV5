/**
 * @component ConfigConflictDetector
 * @description 配置冲突检测组件，用于检测全局设置和用户权限之间的冲突
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 */

"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Settings,
  Users,
  FileText,
} from "lucide-react";

interface ConfigConflict {
  level: string;
  type: 'USER_EXCEEDS_GLOBAL' | 'USER_TOO_RESTRICTIVE' | 'PERMISSION_MISMATCH';
  userLimit: number;
  globalLimit: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  suggestion: string;
}

interface ConfigConflictDetectorProps {
  onRefresh?: () => void;
}

export function ConfigConflictDetector({ onRefresh }: ConfigConflictDetectorProps) {
  const [conflicts, setConflicts] = useState<ConfigConflict[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 获取全局上传设置
  const { data: globalSettings } = api.admin.getSettings.useQuery();

  // 获取所有用户权限配置
  const { data: userPermissions } = api.permission.getAllConfigs.useQuery();

  // 分析配置冲突
  const analyzeConflicts = () => {
    if (!globalSettings || !userPermissions) return;

    setIsAnalyzing(true);

    try {
      const uploadSettings = globalSettings.filter((s: any) => s.category === 'upload');
      const globalConfig = uploadSettings.reduce((acc: any, setting: any) => {
        const key = setting.key.replace('upload.', '');
        try {
          acc[key] = JSON.parse(setting.value);
        } catch {
          acc[key] = setting.value;
        }
        return acc;
      }, {} as Record<string, any>);

      const globalMaxFiles = parseInt(globalConfig.maxFilesPerPost) || 800;
      const detectedConflicts: ConfigConflict[] = [];

      userPermissions.forEach(perm => {
        const userMaxFiles = (perm.maxImagesPerUpload || 0) + (perm.maxVideosPerUpload || 0);

        // 检测用户限制超过全局限制
        if (userMaxFiles > globalMaxFiles && userMaxFiles !== -1) {
          detectedConflicts.push({
            level: perm.userLevel,
            type: 'USER_EXCEEDS_GLOBAL',
            userLimit: userMaxFiles,
            globalLimit: globalMaxFiles,
            severity: 'HIGH',
            description: `${perm.userLevel}等级的文件数量限制(${userMaxFiles})超过了全局限制(${globalMaxFiles})`,
            suggestion: `建议将全局限制提高到${userMaxFiles}以上，或降低${perm.userLevel}等级的限制`
          });
        }

        // 检测用户限制过于严格
        else if (userMaxFiles < globalMaxFiles * 0.1 && userMaxFiles > 0) {
          detectedConflicts.push({
            level: perm.userLevel,
            type: 'USER_TOO_RESTRICTIVE',
            userLimit: userMaxFiles,
            globalLimit: globalMaxFiles,
            severity: 'MEDIUM',
            description: `${perm.userLevel}等级的文件数量限制(${userMaxFiles})相对于全局限制(${globalMaxFiles})过于严格`,
            suggestion: `考虑适当提高${perm.userLevel}等级的文件数量限制以改善用户体验`
          });
        }

        // 检测权限不一致
        if ((perm.maxImagesPerUpload > 0 && !perm.canUploadImages) ||
            (perm.maxVideosPerUpload > 0 && !perm.canUploadVideos)) {
          detectedConflicts.push({
            level: perm.userLevel,
            type: 'PERMISSION_MISMATCH',
            userLimit: userMaxFiles,
            globalLimit: globalMaxFiles,
            severity: 'HIGH',
            description: `${perm.userLevel}等级的上传权限配置不一致`,
            suggestion: `检查并修正${perm.userLevel}等级的上传权限设置`
          });
        }
      });

      setConflicts(detectedConflicts);
    } catch (error) {
      console.error('分析配置冲突时出错:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 当数据变化时重新分析
  useEffect(() => {
    analyzeConflicts();
  }, [globalSettings, userPermissions]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'HIGH': return <AlertTriangle className="w-4 h-4" />;
      case 'MEDIUM': return <Info className="w-4 h-4" />;
      case 'LOW': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              配置冲突检测
            </CardTitle>
            <CardDescription>
              检测全局上传设置与用户权限配置之间的冲突
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              analyzeConflicts();
              onRefresh?.();
            }}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            重新检测
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAnalyzing ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>正在分析配置冲突...</span>
          </div>
        ) : conflicts.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✅ 未发现配置冲突，所有设置都是一致的。
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                发现 {conflicts.length} 个配置冲突，建议及时修复以确保系统正常运行。
              </AlertDescription>
            </Alert>

            {conflicts.map((conflict, index) => (
              <Card key={index} className="border-l-4 border-l-red-500">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(conflict.severity)}>
                        {getSeverityIcon(conflict.severity)}
                        <span className="ml-1">{conflict.severity}</span>
                      </Badge>
                      <Badge variant="outline">
                        <Users className="w-3 h-3 mr-1" />
                        {conflict.level}
                      </Badge>
                    </div>
                    <Badge variant="secondary">
                      {conflict.type}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      <strong>问题描述:</strong> {conflict.description}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>建议修复:</strong> {conflict.suggestion}
                    </p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>用户限制: {conflict.userLimit === -1 ? '无限制' : `${conflict.userLimit}个文件`}</span>
                      <span>全局限制: {conflict.globalLimit}个文件</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>修复建议:</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• 高优先级冲突需要立即修复，可能导致功能异常</li>
                  <li>• 中优先级冲突建议尽快修复，可能影响用户体验</li>
                  <li>• 可以在{'"文件上传"'}和{'"权限管理"'}页面分别调整相关设置</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
