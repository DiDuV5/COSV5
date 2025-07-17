/**
 * @fileoverview 批量操作组件
 * @description 处理用户批量操作功能，从原 admin/users/page.tsx 重构而来
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { Users, Trash2, Edit, Key, Mail, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { USER_LEVEL_OPTIONS } from './UserSearchFilter';

export type BatchOperationType = 
  | 'delete'
  | 'updateLevel'
  | 'resetPassword'
  | 'sendEmail'
  | 'suspend'
  | 'activate';

export interface BatchOperationsProps {
  selectedUsers: string[];
  isOpen: boolean;
  onClose: () => void;
  onExecute: (operation: BatchOperationType, params?: any) => Promise<void>;
  isPending?: boolean;
}

/**
 * 批量操作组件
 * 负责处理用户的批量操作功能
 */
export function BatchOperations({
  selectedUsers,
  isOpen,
  onClose,
  onExecute,
  isPending = false,
}: BatchOperationsProps) {
  const [selectedOperation, setSelectedOperation] = useState<BatchOperationType | ''>('');
  const [operationParams, setOperationParams] = useState<any>({});
  const [confirmDangerous, setConfirmDangerous] = useState(false);

  /**
   * 重置状态
   */
  const resetState = () => {
    setSelectedOperation('');
    setOperationParams({});
    setConfirmDangerous(false);
  };

  /**
   * 处理关闭
   */
  const handleClose = () => {
    resetState();
    onClose();
  };

  /**
   * 处理执行操作
   */
  const handleExecute = async () => {
    if (!selectedOperation) return;

    try {
      await onExecute(selectedOperation, operationParams);
      handleClose();
    } catch (error) {
      console.error('批量操作失败:', error);
    }
  };

  /**
   * 获取操作配置
   */
  const getOperationConfig = (operation: BatchOperationType) => {
    const configs = {
      delete: {
        title: '批量删除用户',
        description: '永久删除选中的用户账户，此操作不可撤销',
        icon: Trash2,
        color: 'text-destructive',
        dangerous: true,
      },
      updateLevel: {
        title: '批量更新用户等级',
        description: '将选中用户的等级更新为指定等级',
        icon: Shield,
        color: 'text-blue-600',
        dangerous: false,
      },
      resetPassword: {
        title: '批量重置密码',
        description: '为选中用户重置密码并发送邮件通知',
        icon: Key,
        color: 'text-orange-600',
        dangerous: false,
      },
      sendEmail: {
        title: '批量发送邮件',
        description: '向选中用户发送自定义邮件',
        icon: Mail,
        color: 'text-green-600',
        dangerous: false,
      },
      suspend: {
        title: '批量暂停用户',
        description: '暂停选中用户的账户，用户将无法登录',
        icon: Shield,
        color: 'text-red-600',
        dangerous: true,
      },
      activate: {
        title: '批量激活用户',
        description: '激活选中用户的账户，恢复正常使用',
        icon: Shield,
        color: 'text-green-600',
        dangerous: false,
      },
    };
    return configs[operation];
  };

  const currentConfig = selectedOperation ? getOperationConfig(selectedOperation) : null;

  /**
   * 渲染操作参数表单
   */
  const renderOperationForm = () => {
    switch (selectedOperation) {
      case 'updateLevel':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="newLevel">新用户等级</Label>
              <Select
                value={operationParams.newLevel || ''}
                onValueChange={(value) => setOperationParams({ ...operationParams, newLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择新等级" />
                </SelectTrigger>
                <SelectContent>
                  {USER_LEVEL_OPTIONS.slice(1).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <option.icon className={`w-4 h-4 ${option.color}`} />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'sendEmail':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="emailSubject">邮件主题</Label>
              <input
                id="emailSubject"
                type="text"
                className="w-full p-2 border rounded"
                value={operationParams.subject || ''}
                onChange={(e) => setOperationParams({ ...operationParams, subject: e.target.value })}
                placeholder="输入邮件主题"
              />
            </div>
            <div>
              <Label htmlFor="emailContent">邮件内容</Label>
              <Textarea
                id="emailContent"
                value={operationParams.content || ''}
                onChange={(e) => setOperationParams({ ...operationParams, content: e.target.value })}
                placeholder="输入邮件内容"
                rows={6}
              />
            </div>
          </div>
        );

      case 'suspend':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="suspendReason">暂停原因</Label>
              <Textarea
                id="suspendReason"
                value={operationParams.reason || ''}
                onChange={(e) => setOperationParams({ ...operationParams, reason: e.target.value })}
                placeholder="请输入暂停用户的原因"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notifyUser"
                checked={operationParams.notifyUser || false}
                onCheckedChange={(checked) => setOperationParams({ ...operationParams, notifyUser: checked })}
              />
              <Label htmlFor="notifyUser">通知用户暂停原因</Label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (selectedUsers.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>批量操作</span>
          </DialogTitle>
          <DialogDescription>
            已选择 <Badge variant="outline">{selectedUsers.length}</Badge> 个用户进行批量操作
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 操作选择 */}
          <div>
            <Label htmlFor="operation">选择操作</Label>
            <Select
              value={selectedOperation}
              onValueChange={(value) => {
                setSelectedOperation(value as BatchOperationType);
                setOperationParams({});
                setConfirmDangerous(false);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择要执行的批量操作" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updateLevel">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>更新用户等级</span>
                  </div>
                </SelectItem>
                <SelectItem value="resetPassword">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-orange-600" />
                    <span>重置密码</span>
                  </div>
                </SelectItem>
                <SelectItem value="sendEmail">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-green-600" />
                    <span>发送邮件</span>
                  </div>
                </SelectItem>
                <SelectItem value="activate">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>激活用户</span>
                  </div>
                </SelectItem>
                <SelectItem value="suspend">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-red-600" />
                    <span>暂停用户</span>
                  </div>
                </SelectItem>
                <SelectItem value="delete">
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    <span>删除用户</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 操作描述 */}
          {currentConfig && (
            <Alert className={currentConfig.dangerous ? 'border-destructive' : ''}>
              <currentConfig.icon className={`h-4 w-4 ${currentConfig.color}`} />
              <AlertDescription>
                <strong>{currentConfig.title}</strong>
                <br />
                {currentConfig.description}
              </AlertDescription>
            </Alert>
          )}

          {/* 操作参数表单 */}
          {renderOperationForm()}

          {/* 危险操作确认 */}
          {currentConfig?.dangerous && (
            <div className="flex items-center space-x-2 p-4 bg-destructive/10 rounded-lg">
              <Checkbox
                id="confirmDangerous"
                checked={confirmDangerous}
                onCheckedChange={setConfirmDangerous}
              />
              <Label htmlFor="confirmDangerous" className="text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-destructive" />
                我确认要执行此危险操作，并了解其后果
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            取消
          </Button>
          <Button
            onClick={handleExecute}
            disabled={
              !selectedOperation ||
              isPending ||
              (currentConfig?.dangerous && !confirmDangerous)
            }
            variant={currentConfig?.dangerous ? 'destructive' : 'default'}
          >
            {isPending ? '执行中...' : '执行操作'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 导出批量操作组件
 */
export default BatchOperations;
