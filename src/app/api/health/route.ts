/**
 * 健康检查API端点
 * 用于CI/CD部署过程中的健康检查
 */

import { NextRequest, NextResponse } from 'next/server'

interface HealthData {
  status: 'ok' | 'warning' | 'error'
  timestamp: string
  version: string
  uptime: number
  environment: string
  app: string
  description: string
  warnings?: string[]
  system?: {
    nodeVersion: string
    platform: string
    arch: string
    memory: {
      used: number
      total: number
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // 基本健康检查
    const healthData: HealthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      app: 'CoserEden',
      description: '专业Cosplay创作者平台'
    }

    // 检查环境变量
    const requiredEnvVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'NEXTAUTH_SECRET'
    ]

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

    if (missingEnvVars.length > 0) {
      healthData.status = 'warning'
      healthData.warnings = [`Missing environment variables: ${missingEnvVars.join(', ')}`]
    }

    // 添加系统信息
    healthData.system = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    }

    // 返回健康状态
    return NextResponse.json(healthData, { status: 200 })
  } catch (error) {
    // 错误情况
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: errorMessage,
      app: 'CoserEden'
    }, { status: 500 })
  }
}
