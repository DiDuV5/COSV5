/**
 * @fileoverview 数据预览表格组件
 * @description 显示解析后的用户数据预览表格
 */

"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type ParsedUserData,
  type ValidationError,
  getUserLevelLabel
} from "../types/batch-create-types";

interface DataPreviewTableProps {
  users: ParsedUserData[];
  errors: string[];
  validationErrors?: ValidationError[];
  className?: string;
}

/**
 * 数据预览表格组件
 */
export function DataPreviewTable({
  users,
  errors,
  validationErrors = [],
  className
}: DataPreviewTableProps) {
  const [showPasswords, setShowPasswords] = useState(false);

  if (users.length === 0 && errors.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        请先在数据导入页面解析CSV数据
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 统计信息 */}
      <div className="mb-4 flex items-center gap-4">
        <Badge variant="outline" className="text-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          有效用户: {users.length}
        </Badge>
        {errors.length > 0 && (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            错误: {errors.length}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPasswords(!showPasswords)}
          className="ml-auto"
        >
          {showPasswords ? (
            <>
              <EyeOff className="w-4 h-4 mr-1" />
              隐藏密码
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-1" />
              显示密码
            </>
          )}
        </Button>
      </div>

      {/* 错误信息 */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">数据解析错误:</div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 验证错误详情 */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">字段验证错误:</div>
            <div className="space-y-2 text-sm">
              {validationErrors.map((error, index) => (
                <div key={index} className="border-l-2 border-red-300 pl-2">
                  <div className="font-medium">第{error.lineNumber}行 - {error.field}</div>
                  <div className="text-red-600">{error.message}</div>
                  {error.value && (
                    <div className="text-gray-600">值: {error.value}</div>
                  )}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 用户数据表格 */}
      {users.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>密码</TableHead>
                <TableHead>显示名称</TableHead>
                <TableHead>个人简介</TableHead>
                <TableHead>用户等级</TableHead>
                <TableHead>已验证</TableHead>
                <TableHead>可发布</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {user.lineNumber || index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{user.username}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600">
                      {user.email || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.password ? (
                        showPasswords ? (
                          <span className="font-mono">{user.password}</span>
                        ) : (
                          <span className="text-gray-400">••••••••</span>
                        )
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.displayName || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-32 truncate" title={user.bio}>
                      {user.bio || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getUserLevelLabel(user.userLevel || 'USER')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isVerified ? "default" : "secondary"}>
                      {user.isVerified ? '是' : '否'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.canPublish ? "default" : "secondary"}>
                      {user.canPublish ? '是' : '否'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 数据统计 */}
      {users.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h5 className="text-sm font-medium text-gray-800 mb-2">数据统计</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">总用户数</div>
              <div className="font-medium">{users.length}</div>
            </div>
            <div>
              <div className="text-gray-600">有邮箱</div>
              <div className="font-medium">
                {users.filter(u => u.email).length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">已验证</div>
              <div className="font-medium">
                {users.filter(u => u.isVerified).length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">可发布</div>
              <div className="font-medium">
                {users.filter(u => u.canPublish).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 字段说明 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h5 className="text-sm font-medium text-blue-800 mb-2">字段说明</h5>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• <strong>用户名</strong>: 必填，3-20个字符，只能包含字母、数字和下划线</li>
          <li>• <strong>邮箱</strong>: 可选，必须是有效的邮箱格式</li>
          <li>• <strong>密码</strong>: 可选，至少6个字符，如果为空将生成随机密码</li>
          <li>• <strong>显示名称</strong>: 可选，最多50个字符</li>
          <li>• <strong>个人简介</strong>: 可选，最多500个字符</li>
          <li>• <strong>用户等级</strong>: 可选，默认为普通用户</li>
          <li>• <strong>已验证</strong>: 布尔值，true/false 或 1/0</li>
          <li>• <strong>可发布</strong>: 布尔值，true/false 或 1/0</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * 数据预览卡片组件
 */
export function DataPreviewCard({
  users,
  errors
}: {
  users: ParsedUserData[];
  errors: string[];
}) {
  const totalUsers = users.length;
  const verifiedUsers = users.filter(u => u.isVerified).length;
  const publishUsers = users.filter(u => u.canPublish).length;
  const usersWithEmail = users.filter(u => u.email).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 border rounded-lg">
        <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
        <div className="text-sm text-gray-600">总用户数</div>
      </div>
      <div className="p-4 border rounded-lg">
        <div className="text-2xl font-bold text-green-600">{verifiedUsers}</div>
        <div className="text-sm text-gray-600">已验证用户</div>
      </div>
      <div className="p-4 border rounded-lg">
        <div className="text-2xl font-bold text-purple-600">{publishUsers}</div>
        <div className="text-sm text-gray-600">可发布用户</div>
      </div>
      <div className="p-4 border rounded-lg">
        <div className="text-2xl font-bold text-orange-600">{usersWithEmail}</div>
        <div className="text-sm text-gray-600">有邮箱用户</div>
      </div>
      {errors.length > 0 && (
        <div className="col-span-full p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="text-2xl font-bold text-red-600">{errors.length}</div>
          <div className="text-sm text-red-600">解析错误</div>
        </div>
      )}
    </div>
  );
}
