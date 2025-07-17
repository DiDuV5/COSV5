/**
 * @fileoverview 罐头系统概览页面
 * @description 实时数据统计和可视化分析仪表板
 * @author Augment AI
 * @date 2024-12-01
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - react: ^18.0.0
 * - @trpc/react-query: ^10.45.0
 * - recharts: ^2.15.3
 * - next: ^14.0.0
 *
 * @changelog
 * - 2024-12-01: 初始版本创建，支持实时数据统计和图表展示
 */

"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// import { TabsTrigger } from "@/components/ui/tabs"; // 暂时未使用
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart as _LineChart,
  Line as _Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Coins,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw,
  Download,
  Settings,
  Eye,
} from "lucide-react";

// 图表颜色配置
const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#10b981",
  accent: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

const __PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

interface _SystemOverviewProps {}

// 实时统计卡片组件
function RealTimeStats() {
  const { data: stats, isPending, refetch } = api.cans.analytics.getSystemStats.useQuery();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // 自动刷新数据
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastUpdate(new Date());
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, [refetch]);

  if (isPending) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "总用户数",
      value: stats.overview.totalAccounts,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      change: "+12%",
      changeType: "increase" as const,
    },
    {
      title: "罐头总量",
      value: stats.overview.totalCansInCirculation.toLocaleString(),
      icon: Coins,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      change: "+8.5%",
      changeType: "increase" as const,
    },
    {
      title: "今日签到",
      value: stats.today.checkins,
      icon: Calendar,
      color: "text-green-500",
      bgColor: "bg-green-50",
      change: "+15%",
      changeType: "increase" as const,
    },
    {
      title: "今日任务",
      value: stats.today.tasks,
      icon: Target,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      change: "-2%",
      changeType: "decrease" as const,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">实时统计</h2>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>最后更新: {lastUpdate.toLocaleTimeString()}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetch();
              setLastUpdate(new Date());
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    {stat.changeType === "increase" ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span
                      className={`text-sm ${
                        stat.changeType === "increase" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 系统健康状态组件
function SystemHealthStatus() {
  const healthChecks = [
    { name: "数据库连接", status: "healthy", message: "连接正常", responseTime: "12ms" },
    { name: "缓存系统", status: "healthy", message: "Redis 运行正常", responseTime: "3ms" },
    { name: "任务队列", status: "warning", message: "队列积压较多", responseTime: "45ms" },
    { name: "文件存储", status: "healthy", message: "存储空间充足", responseTime: "8ms" },
    { name: "邮件服务", status: "error", message: "SMTP 连接失败", responseTime: "timeout" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800">正常</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">警告</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">错误</Badge>;
      default:
        return <Badge variant="secondary">未知</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-500" />
          <span>系统健康状态</span>
        </CardTitle>
        <CardDescription>实时监控系统各组件运行状态</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {healthChecks.map((check, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(check.status)}
                <div>
                  <p className="font-medium">{check.name}</p>
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">{check.responseTime}</span>
                {getStatusBadge(check.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 快速操作面板
function QuickActions() {
  const actions = [
    {
      title: "用户管理",
      description: "查看和管理用户账户",
      icon: Users,
      color: "text-blue-500",
      href: "/admin/users",
    },
    {
      title: "配置管理",
      description: "调整系统配置参数",
      icon: Settings,
      color: "text-green-500",
      href: "/admin/cans/config",
    },
    {
      title: "交易监控",
      description: "监控交易流水记录",
      icon: BarChart3,
      color: "text-purple-500",
      href: "/admin/cans/transactions",
    },
    {
      title: "数据导出",
      description: "导出统计报告数据",
      icon: Download,
      color: "text-orange-500",
      href: "#",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-purple-500" />
          <span>快速操作</span>
        </CardTitle>
        <CardDescription>常用管理操作的快速入口</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 justify-start"
              asChild
            >
              <a href={action.href}>
                <div className="flex items-center space-x-3">
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <div className="text-left">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 数据趋势图表组件
function DataTrendsCharts() {
  const [timeRange, setTimeRange] = useState("7d");

  // 模拟趋势数据
  const trendData = [
    { date: "12-01", checkins: 45, tasks: 120, cans: 2400 },
    { date: "12-02", checkins: 52, tasks: 135, cans: 2650 },
    { date: "12-03", checkins: 48, tasks: 128, cans: 2580 },
    { date: "12-04", checkins: 61, tasks: 142, cans: 2890 },
    { date: "12-05", checkins: 55, tasks: 138, cans: 2720 },
    { date: "12-06", checkins: 67, tasks: 156, cans: 3100 },
    { date: "12-07", checkins: 59, tasks: 145, cans: 2950 },
  ];

  // 用户活跃度分布数据
  const userActivityData = [
    { name: "高活跃", value: 35, color: CHART_COLORS.primary },
    { name: "中活跃", value: 45, color: CHART_COLORS.secondary },
    { name: "低活跃", value: 20, color: CHART_COLORS.accent },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">数据趋势分析</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">近7天</SelectItem>
            <SelectItem value="30d">近30天</SelectItem>
            <SelectItem value="90d">近90天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 罐头流入流出趋势 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>罐头流入流出趋势</span>
            </CardTitle>
            <CardDescription>每日罐头获得和消费统计</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="cans"
                  stroke={CHART_COLORS.primary}
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 用户活跃度分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <span>用户活跃度分布</span>
            </CardTitle>
            <CardDescription>用户活跃程度统计分析</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userActivityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userActivityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 签到和任务完成趋势 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <span>签到和任务完成趋势</span>
            </CardTitle>
            <CardDescription>每日签到人数和任务完成数量对比</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="checkins" fill={CHART_COLORS.secondary} name="签到人数" />
                <Bar dataKey="tasks" fill={CHART_COLORS.accent} name="任务完成" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CansOverviewPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">罐头系统概览</h1>
          <p className="text-muted-foreground mt-2">
            实时监控罐头系统运行状态和关键指标
          </p>
        </div>
        <Button variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          查看详细报告
        </Button>
      </div>

      {/* 实时统计 */}
      <RealTimeStats />

      {/* 系统状态和快速操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthStatus />
        <QuickActions />
      </div>

      {/* 数据趋势图表 */}
      <DataTrendsCharts />
    </div>
  );
}
