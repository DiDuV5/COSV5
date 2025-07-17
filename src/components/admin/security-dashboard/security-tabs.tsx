/**
 * @fileoverview 安全监控标签页组件
 * @description 提供安全监控的详细信息标签页内容
 * @author Augment AI
 * @date 2025-07-08
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Lock,
  Settings
} from 'lucide-react';
import { SecurityStatus, VulnerabilityDetail } from './types';

interface SecurityTabsProps {
  securityStatus: SecurityStatus;
  vulnerabilities: VulnerabilityDetail[];
  getRiskLevelColor: (level: string) => string;
}

/**
 * 漏洞管理标签页
 */
function VulnerabilitiesTab({ 
  securityStatus, 
  vulnerabilities, 
  getRiskLevelColor 
}: SecurityTabsProps) {
  return (
    <TabsContent value="vulnerabilities" className="space-y-4">
      {/* 漏洞分布 */}
      <Card>
        <CardHeader>
          <CardTitle>漏洞风险分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {securityStatus.vulnerabilities.critical}
              </div>
              <div className="text-sm text-gray-600">关键</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {securityStatus.vulnerabilities.high}
              </div>
              <div className="text-sm text-gray-600">高危</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {securityStatus.vulnerabilities.medium}
              </div>
              <div className="text-sm text-gray-600">中危</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {securityStatus.vulnerabilities.low}
              </div>
              <div className="text-sm text-gray-600">低危</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 漏洞列表 */}
      <Card>
        <CardHeader>
          <CardTitle>漏洞详情</CardTitle>
        </CardHeader>
        <CardContent>
          {vulnerabilities.length > 0 ? (
            <div className="space-y-4">
              {vulnerabilities.map((vuln) => (
                <Alert key={vuln.id} className="border-l-4 border-l-orange-500">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center gap-2">
                    {vuln.type}
                    <Badge className={getRiskLevelColor(vuln.riskLevel)}>
                      {vuln.riskLevel}
                    </Badge>
                    {vuln.cvssScore && (
                      <Badge variant="outline">
                        CVSS: {vuln.cvssScore}
                      </Badge>
                    )}
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="mb-2">{vuln.description}</p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>影响:</strong> {vuln.impact}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>位置:</strong> {vuln.location}
                    </p>
                    <p className="text-sm text-blue-600">
                      <strong>修复建议:</strong> {vuln.remediation}
                    </p>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">未发现安全漏洞</p>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

/**
 * 数据加密标签页
 */
function EncryptionTab({ securityStatus }: { securityStatus: SecurityStatus }) {
  return (
    <TabsContent value="encryption" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              加密状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>传输加密 (HTTPS)</span>
              {securityStatus.encryption.transportEncryption ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span>存储加密</span>
              {securityStatus.encryption.storageEncryption ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            
            <div className="flex justify-between items-center">
              <span>密码加密强度</span>
              <Badge variant={
                securityStatus.encryption.passwordStrength === 'STRONG' ? 'default' :
                securityStatus.encryption.passwordStrength === 'MEDIUM' ? 'secondary' : 'destructive'
              }>
                {securityStatus.encryption.passwordStrength}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>敏感数据保护</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>加密覆盖率</span>
                <span>{securityStatus.encryption.sensitiveDataCoverage}%</span>
              </div>
              <Progress value={securityStatus.encryption.sensitiveDataCoverage} />
              <p className="text-sm text-gray-600">
                {securityStatus.encryption.sensitiveDataCoverage >= 95 ? '优秀' :
                 securityStatus.encryption.sensitiveDataCoverage >= 80 ? '良好' : '需要改进'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}

/**
 * 权限审计标签页
 */
function PermissionsTab({ securityStatus }: { securityStatus: SecurityStatus }) {
  return (
    <TabsContent value="permissions" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>权限统计</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>总用户数</span>
              <span className="font-semibold">{securityStatus.permissions.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span>过度权限用户</span>
              <span className="font-semibold text-orange-600">
                {securityStatus.permissions.overPrivilegedUsers}
              </span>
            </div>
            <div className="flex justify-between">
              <span>未使用权限</span>
              <span className="font-semibold text-blue-600">
                {securityStatus.permissions.unusedPermissions}
              </span>
            </div>
            <div className="flex justify-between">
              <span>权限冲突</span>
              <span className="font-semibold text-red-600">
                {securityStatus.permissions.permissionConflicts}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>权限建议</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {securityStatus.permissions.overPrivilegedUsers > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    发现 {securityStatus.permissions.overPrivilegedUsers} 个过度权限用户，建议审查并移除不必要的权限。
                  </AlertDescription>
                </Alert>
              )}
              {securityStatus.permissions.unusedPermissions > 0 && (
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    发现 {securityStatus.permissions.unusedPermissions} 个未使用权限，建议清理以简化权限管理。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}

/**
 * 威胁监控标签页
 */
function ThreatsTab({ securityStatus }: { securityStatus: SecurityStatus }) {
  return (
    <TabsContent value="threats" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>攻击拦截</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {securityStatus.threats.blockedAttacks}
              </div>
              <div className="text-sm text-gray-600">今日拦截次数</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>可疑活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {securityStatus.threats.suspiciousActivities}
              </div>
              <div className="text-sm text-gray-600">待审查活动</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>登录失败</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {securityStatus.threats.failedLogins}
              </div>
              <div className="text-sm text-gray-600">今日失败次数</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
}

/**
 * 安全监控标签页组合组件
 */
export function SecurityTabs({ 
  securityStatus, 
  vulnerabilities, 
  getRiskLevelColor 
}: SecurityTabsProps) {
  return (
    <Tabs defaultValue="vulnerabilities" className="space-y-4">
      <TabsList>
        <TabsTrigger value="vulnerabilities">漏洞管理</TabsTrigger>
        <TabsTrigger value="encryption">数据加密</TabsTrigger>
        <TabsTrigger value="permissions">权限审计</TabsTrigger>
        <TabsTrigger value="threats">威胁监控</TabsTrigger>
      </TabsList>

      <VulnerabilitiesTab 
        securityStatus={securityStatus}
        vulnerabilities={vulnerabilities}
        getRiskLevelColor={getRiskLevelColor}
      />
      <EncryptionTab securityStatus={securityStatus} />
      <PermissionsTab securityStatus={securityStatus} />
      <ThreatsTab securityStatus={securityStatus} />
    </Tabs>
  );
}
