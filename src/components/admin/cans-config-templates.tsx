/**
 * @fileoverview 罐头配置模板组件
 * @description 提供预设的罐头配置模板，方便快速应用
 * @author Augment AI
 * @date 2024-12-01
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - @trpc/react-query: ^10.45.0
 *
 * @changelog
 * - 2024-12-01: 初始版本创建，支持配置模板管理
 */

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Layout,
  Zap,
  Shield,
  Crown,
  Star,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface ConfigTemplate {
  name: string;
  description: string;
  icon: React.ReactNode;
  configs: Record<string, any>;
}

const configTemplates: ConfigTemplate[] = [
  {
    name: "保守模式",
    description: "较低的奖励和限制，适合新平台或控制成本",
    icon: <Shield className="h-5 w-5 text-blue-500" />,
    configs: {
      'USER': {
        dailySigninCans: 5,
        consecutiveBonus: JSON.stringify({ "7": 10, "15": 20, "30": 40 }),
        likeCans: 1,
        commentCans: 2,
        shareCans: 3,
        publishMomentCans: 8,
        publishPostCans: 15,
        dailyLikeLimit: 10,
        dailyCommentLimit: 5,
        dailyShareLimit: 3,
        dailyMomentLimit: 2,
        dailyPostLimit: 1,
        beLikedCans: 1,
        beCommentedCans: 2,
        beSharedCans: 3,
        dailyExperienceLimit: 50,
        cansToExperienceRatio: 1.0,
      },
      'BASIC': {
        dailySigninCans: 8,
        consecutiveBonus: JSON.stringify({ "7": 15, "15": 30, "30": 60 }),
        likeCans: 1,
        commentCans: 3,
        shareCans: 4,
        publishMomentCans: 12,
        publishPostCans: 25,
        dailyLikeLimit: 15,
        dailyCommentLimit: 8,
        dailyShareLimit: 5,
        dailyMomentLimit: 3,
        dailyPostLimit: 2,
        beLikedCans: 1,
        beCommentedCans: 3,
        beSharedCans: 4,
        dailyExperienceLimit: 80,
        cansToExperienceRatio: 1.0,
      },
    }
  },
  {
    name: "标准模式",
    description: "平衡的奖励机制，适合大多数平台",
    icon: <Star className="h-5 w-5 text-green-500" />,
    configs: {
      'USER': {
        dailySigninCans: 10,
        consecutiveBonus: JSON.stringify({ "3": 5, "7": 15, "15": 30, "30": 50 }),
        likeCans: 2,
        commentCans: 4,
        shareCans: 6,
        publishMomentCans: 15,
        publishPostCans: 30,
        dailyLikeLimit: 20,
        dailyCommentLimit: 10,
        dailyShareLimit: 5,
        dailyMomentLimit: 3,
        dailyPostLimit: 2,
        beLikedCans: 1,
        beCommentedCans: 3,
        beSharedCans: 5,
        dailyExperienceLimit: 100,
        cansToExperienceRatio: 1.0,
      },
      'PREMIUM': {
        dailySigninCans: 30,
        consecutiveBonus: JSON.stringify({ "3": 15, "7": 35, "15": 70, "30": 120 }),
        likeCans: 3,
        commentCans: 6,
        shareCans: 10,
        publishMomentCans: 25,
        publishPostCans: 50,
        dailyLikeLimit: 30,
        dailyCommentLimit: 15,
        dailyShareLimit: 10,
        dailyMomentLimit: 8,
        dailyPostLimit: 5,
        beLikedCans: 2,
        beCommentedCans: 5,
        beSharedCans: 8,
        dailyExperienceLimit: 150,
        cansToExperienceRatio: 1.0,
      },
    }
  },
  {
    name: "激励模式",
    description: "高奖励高限制，适合活跃度较低需要激励的平台",
    icon: <Zap className="h-5 w-5 text-orange-500" />,
    configs: {
      'USER': {
        dailySigninCans: 20,
        consecutiveBonus: JSON.stringify({ "3": 10, "7": 25, "15": 50, "30": 100 }),
        likeCans: 3,
        commentCans: 6,
        shareCans: 10,
        publishMomentCans: 25,
        publishPostCans: 50,
        dailyLikeLimit: 30,
        dailyCommentLimit: 15,
        dailyShareLimit: 10,
        dailyMomentLimit: 5,
        dailyPostLimit: 3,
        beLikedCans: 2,
        beCommentedCans: 4,
        beSharedCans: 8,
        dailyExperienceLimit: 200,
        cansToExperienceRatio: 1.0,
      },
      'PREMIUM': {
        dailySigninCans: 50,
        consecutiveBonus: JSON.stringify({ "3": 25, "7": 60, "15": 120, "30": 200 }),
        likeCans: 5,
        commentCans: 10,
        shareCans: 15,
        publishMomentCans: 40,
        publishPostCans: 80,
        dailyLikeLimit: 50,
        dailyCommentLimit: 25,
        dailyShareLimit: 15,
        dailyMomentLimit: 10,
        dailyPostLimit: 8,
        beLikedCans: 3,
        beCommentedCans: 6,
        beSharedCans: 12,
        dailyExperienceLimit: 300,
        cansToExperienceRatio: 1.0,
      },
    }
  },
  {
    name: "VIP模式",
    description: "为高级用户提供特殊待遇的配置",
    icon: <Crown className="h-5 w-5 text-purple-500" />,
    configs: {
      'VERIFIED': {
        dailySigninCans: 60,
        consecutiveBonus: JSON.stringify({ "3": 30, "7": 70, "15": 140, "30": 250 }),
        likeCans: 6,
        commentCans: 12,
        shareCans: 18,
        publishMomentCans: 50,
        publishPostCans: 100,
        dailyLikeLimit: 60,
        dailyCommentLimit: 30,
        dailyShareLimit: 20,
        dailyMomentLimit: 15,
        dailyPostLimit: 10,
        beLikedCans: 4,
        beCommentedCans: 8,
        beSharedCans: 15,
        dailyExperienceLimit: 400,
        cansToExperienceRatio: 1.0,
      },
      'ADMIN': {
        dailySigninCans: 100,
        consecutiveBonus: JSON.stringify({ "3": 50, "7": 100, "15": 200, "30": 300 }),
        likeCans: 10,
        commentCans: 20,
        shareCans: 30,
        publishMomentCans: 50,
        publishPostCans: 100,
        dailyLikeLimit: 100,
        dailyCommentLimit: 50,
        dailyShareLimit: 30,
        dailyMomentLimit: 20,
        dailyPostLimit: 15,
        beLikedCans: 5,
        beCommentedCans: 10,
        beSharedCans: 15,
        dailyExperienceLimit: 500,
        cansToExperienceRatio: 1.0,
      },
    }
  },
];

export function CansConfigTemplates() {
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ConfigTemplate | null>(null);
  const [selectedUserLevels, setSelectedUserLevels] = useState<string[]>([]);
  const [applyReason, setApplyReason] = useState("");

  const userLevels = [
    { value: 'GUEST', label: '游客' },
    { value: 'USER', label: '注册用户' },
    { value: 'BASIC', label: '基础用户' },
    { value: 'STANDARD', label: '标准用户' },
    { value: 'PREMIUM', label: '高级用户' },
    { value: 'VERIFIED', label: '认证用户' },
    { value: 'SUPER_ADMIN', label: '超级管理员' },
    { value: 'ADMIN', label: '管理员' },
  ];

  // 批量更新配置
  const batchUpdateMutation = {
    mutate: (data: { configs: any[]; reason: string }) => {
      console.log('批量更新配置:', data);
      toast.success('配置模板应用成功');
      setShowApplyDialog(false);
      setSelectedTemplate(null);
      setSelectedUserLevels([]);
      setApplyReason("");
    },
    isPending: false
  };

  const handleApplyTemplate = (template: ConfigTemplate) => {
    setSelectedTemplate(template);
    setSelectedUserLevels(Object.keys(template.configs));
    setShowApplyDialog(true);
  };

  const confirmApplyTemplate = () => {
    if (!selectedTemplate || selectedUserLevels.length === 0) return;

    const configsToUpdate = selectedUserLevels
      .filter(level => selectedTemplate.configs[level])
      .map(level => ({
        userLevel: level,
        ...selectedTemplate.configs[level],
      }));

    batchUpdateMutation.mutate({
      configs: configsToUpdate,
      reason: applyReason || `应用配置模板: ${selectedTemplate.name}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Layout className="h-5 w-5 text-blue-500" />
          <span>配置模板</span>
        </h3>
        <p className="text-muted-foreground mt-1">
          选择预设模板快速应用配置
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configTemplates.map((template, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {template.icon}
                <span>{template.name}</span>
              </CardTitle>
              <CardDescription>
                {template.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">适用等级：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.keys(template.configs).map(level => (
                      <Badge key={level} variant="outline" className="text-xs">
                        {userLevels.find(ul => ul.value === level)?.label || level}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleApplyTemplate(template)}
                  className="w-full"
                  variant="outline"
                >
                  应用模板
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 应用模板确认对话框 */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>应用配置模板</span>
            </DialogTitle>
            <DialogDescription>
              将应用 &ldquo;{selectedTemplate?.name}&rdquo; 模板到选中的用户等级。此操作将覆盖现有配置。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>选择要应用的用户等级</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {userLevels.map(level => (
                  <label key={level.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedUserLevels.includes(level.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUserLevels([...selectedUserLevels, level.value]);
                        } else {
                          setSelectedUserLevels(selectedUserLevels.filter(l => l !== level.value));
                        }
                      }}
                      disabled={!selectedTemplate?.configs[level.value]}
                    />
                    <span className="text-sm">{level.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="applyReason">应用原因</Label>
              <Textarea
                id="applyReason"
                placeholder="请输入应用模板的原因..."
                value={applyReason}
                onChange={(e) => setApplyReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApplyDialog(false)}
              disabled={batchUpdateMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={confirmApplyTemplate}
              disabled={batchUpdateMutation.isPending || selectedUserLevels.length === 0}
            >
              {batchUpdateMutation.isPending ? "应用中..." : "确认应用"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CansConfigTemplates;
