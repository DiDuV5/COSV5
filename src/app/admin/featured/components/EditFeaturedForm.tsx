/**
 * @fileoverview 编辑精选内容表单组件
 * @description 用于编辑现有的精选内容
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 */

"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  title: string;
  author: {
    displayName: string | null;
    username: string;
  };
}

interface FeaturedItem {
  id: string;
  contentId: string | null;
  contentType: string;
  title: string | null;
  description: string | null;
  coverImage: string | null;
  position: number;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  reason: string | null;
}

interface EditFeaturedFormProps {
  item: FeaturedItem;
  availablePosts: Post[] | undefined;
  onSuccess: () => void;
}

export function EditFeaturedForm({ item, availablePosts, onSuccess }: EditFeaturedFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    contentId: item.contentId || "",
    contentType: item.contentType || "POST",
    title: item.title || "",
    description: item.description || "",
    coverImage: item.coverImage || "",
    position: item.position || 0,
    isActive: item.isActive ?? true,
    startDate: item.startDate ? new Date(item.startDate).toISOString().slice(0, 16) : "",
    endDate: item.endDate ? new Date(item.endDate).toISOString().slice(0, 16) : "",
    reason: item.reason || "",
  });

  const updateFeaturedMutation = api.recommendation.updateFeatured.useMutation({
    onSuccess: () => {
      toast({
        title: "更新成功",
        description: "精选内容已成功更新",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "更新失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: any = {
      id: item.id,
      ...formData,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
    };

    // 如果没有选择内容，则移除contentId
    if (!formData.contentId) {
      delete submitData.contentId;
    }

    updateFeaturedMutation.mutate(submitData);
  };

  const selectedPost = availablePosts?.find(post => post.id === formData.contentId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 选择关联内容 */}
      <div className="space-y-2">
        <Label htmlFor="contentId">关联内容 (可选)</Label>
        <Select value={formData.contentId} onValueChange={(value) => {
          setFormData(prev => ({ ...prev, contentId: value }));
        }}>
          <SelectTrigger>
            <SelectValue placeholder="选择要精选的作品" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">不关联具体内容</SelectItem>
            {availablePosts?.map((post) => (
              <SelectItem key={post.id} value={post.id}>
                {post.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedPost && (
          <div className="text-sm text-muted-foreground">
            作者: {selectedPost.author.displayName || selectedPost.author.username}
          </div>
        )}
      </div>

      {/* 精选标题 */}
      <div className="space-y-2">
        <Label htmlFor="title">精选标题 *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="输入精选内容的标题"
          required
        />
      </div>

      {/* 精选描述 */}
      <div className="space-y-2">
        <Label htmlFor="description">精选描述</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="输入精选内容的描述"
          rows={3}
        />
      </div>

      {/* 封面图片 */}
      <div className="space-y-2">
        <Label htmlFor="coverImage">封面图片URL</Label>
        <Input
          id="coverImage"
          value={formData.coverImage}
          onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
          placeholder="输入封面图片的URL"
        />
      </div>

      {/* 显示位置 */}
      <div className="space-y-2">
        <Label htmlFor="position">显示位置</Label>
        <Input
          id="position"
          type="number"
          value={formData.position}
          onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) || 0 }))}
          placeholder="数字越小越靠前"
        />
      </div>

      {/* 时间范围 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">开始时间</Label>
          <Input
            id="startDate"
            type="datetime-local"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">结束时间</Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      </div>

      {/* 精选原因 */}
      <div className="space-y-2">
        <Label htmlFor="reason">精选原因</Label>
        <Textarea
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
          placeholder="记录精选的原因"
          rows={2}
        />
      </div>

      {/* 是否激活 */}
      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
        />
        <Label htmlFor="isActive">激活状态</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onSuccess}>
          取消
        </Button>
        <Button type="submit" disabled={updateFeaturedMutation.isPending}>
          {updateFeaturedMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}
