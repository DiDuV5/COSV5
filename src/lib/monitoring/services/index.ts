/**
 * @fileoverview 监控服务工厂
 * @description 统一导出监控相关的服务实例
 * @author Augment AI
 * @date 2025-06-29
 * @version 1.0.0
 * @since 1.0.0
 */

import type { PrismaClient } from '@prisma/client';
import type { S3Client } from '@aws-sdk/client-s3';
import { StorageMonitoringService } from './storage-monitoring-service';
import { PerformanceMonitoringService } from './performance-monitoring-service';
import { AlertManagementService } from './alert-management-service';
import { BusinessMetricsService } from './business-metrics-service';
import { ErrorMetricsService } from './error-metrics-service';
import { SystemMetricsService } from './system-metrics-service';

/**
 * 创建存储监控服务实例
 */
export const storageMonitoringService = (s3Client: S3Client, prisma: PrismaClient) => 
  new StorageMonitoringService(s3Client, prisma);

/**
 * 创建性能监控服务实例
 */
export const performanceMonitoringService = (prisma: PrismaClient) => 
  new PerformanceMonitoringService(prisma);

/**
 * 创建告警管理服务实例
 */
export const alertManagementService = () => new AlertManagementService();

/**
 * 创建业务指标服务实例
 */
export const businessMetricsService = (prisma: PrismaClient) => 
  new BusinessMetricsService(prisma);

/**
 * 创建错误指标服务实例
 */
export const errorMetricsService = (prisma: PrismaClient) => 
  new ErrorMetricsService(prisma);

/**
 * 创建系统指标服务实例
 */
export const systemMetricsService = () => new SystemMetricsService();

/**
 * 导出所有服务类型
 */
export type { BusinessMetrics } from '../types/monitoring-types';
export type { ErrorMetrics } from '../types/monitoring-types';
export type { SystemMetrics } from '../types/monitoring-types';
export type { ErrorType, ErrorSeverity, ErrorRecord } from './error-metrics-service';
