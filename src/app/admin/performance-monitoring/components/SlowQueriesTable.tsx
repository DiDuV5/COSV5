/**
 * @fileoverview 慢查询表格组件
 * @description 显示慢查询的详细列表和分析
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Clock,
  Database,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Eye
} from "lucide-react";

interface SlowQuery {
  queryId: string;
  model: string;
  action: string;
  duration: number;
  timestamp: Date;
  params?: any;
  isSlow: boolean;
  queryHash: string;
  frequency?: number;
}

interface SlowQueriesTableProps {
  data?: SlowQuery[];
  isLoading: boolean;
}

type SortField = 'duration' | 'timestamp' | 'frequency' | 'model';
type SortDirection = 'asc' | 'desc';

export function SlowQueriesTable({ data, isLoading }: SlowQueriesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>('duration');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedQuery, setSelectedQuery] = useState<SlowQuery | null>(null);

  if (isLoading) {
    return <SlowQueriesTableSkeleton />;
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>慢查询分析</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">暂无慢查询记录</p>
            <p className="text-sm text-gray-400 mt-1">
              这是一个好消息！当前时间范围内没有检测到慢查询。
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 获取所有模型用于筛选
  const models = Array.from(new Set(data.map(q => q.model))).filter(Boolean);

  // 过滤和排序数据
  const filteredData = data
    .filter(query => {
      const matchesSearch = !searchTerm ||
        query.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.action?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesModel = modelFilter === "all" || query.model === modelFilter;

      return matchesSearch && matchesModel;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'timestamp':
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
          break;
        case 'frequency':
          aValue = a.frequency || 1;
          bValue = b.frequency || 1;
          break;
        case 'model':
          aValue = a.model || '';
          bValue = b.model || '';
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ChevronUp className="h-4 w-4" /> :
      <ChevronDown className="h-4 w-4" />;
  };

  const formatDuration = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms.toFixed(1)}ms`;
  };

  const getDurationColor = (duration: number) => {
    if (duration >= 1000) return 'bg-red-100 text-red-800';
    if (duration >= 500) return 'bg-orange-100 text-orange-800';
    if (duration >= 100) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  const truncateArgs = (params: any) => {
    if (!params) return 'N/A';
    const str = JSON.stringify(params);
    return str.length > 50 ? str.substring(0, 50) + '...' : str;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>慢查询分析</span>
              <Badge variant="destructive">{data.length}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 筛选和搜索 */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索模型或操作..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有模型</SelectItem>
                  {models.map(model => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{filteredData.length}</div>
              <div className="text-sm text-gray-600">慢查询总数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredData.length > 0 ? formatDuration(
                  filteredData.reduce((sum, q) => sum + q.duration, 0) / filteredData.length
                ) : '0ms'}
              </div>
              <div className="text-sm text-gray-600">平均响应时间</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {filteredData.length > 0 ? formatDuration(Math.max(...filteredData.map(q => q.duration))) : '0ms'}
              </div>
              <div className="text-sm text-gray-600">最慢查询</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {new Set(filteredData.map(q => q.model)).size}
              </div>
              <div className="text-sm text-gray-600">涉及模型数</div>
            </div>
          </div>

          {/* 查询表格 */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('model')}
                  >
                    <div className="flex items-center space-x-1">
                      <Database className="h-4 w-4" />
                      <span>模型</span>
                      {getSortIcon('model')}
                    </div>
                  </TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('duration')}
                  >
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>响应时间</span>
                      {getSortIcon('duration')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort('timestamp')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>时间</span>
                      {getSortIcon('timestamp')}
                    </div>
                  </TableHead>
                  <TableHead>参数</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((query) => (
                  <TableRow key={query.queryId} className="hover:bg-gray-50">
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {query.model || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium capitalize">
                        {query.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDurationColor(query.duration)}>
                        {formatDuration(query.duration)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {formatTimestamp(query.timestamp)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500 font-mono">
                        {truncateArgs(query.params)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedQuery(query)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>没有找到匹配的慢查询记录</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 查询详情模态框 */}
      {selectedQuery && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>查询详情</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedQuery(null)}
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">模型</label>
                  <p className="mt-1 capitalize">{selectedQuery.model}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">操作</label>
                  <p className="mt-1 capitalize">{selectedQuery.action}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">响应时间</label>
                  <p className="mt-1">{formatDuration(selectedQuery.duration)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">时间</label>
                  <p className="mt-1">{formatTimestamp(selectedQuery.timestamp)}</p>
                </div>
              </div>

              {selectedQuery.params && (
                <div>
                  <label className="text-sm font-medium text-gray-600">查询参数</label>
                  <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedQuery.params, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function SlowQueriesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
          </div>

          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
