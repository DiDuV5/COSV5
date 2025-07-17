/**
 * @fileoverview 搜索页面
 * @description 全站搜索功能页面，支持内容、用户、标签搜索
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - @trpc/react-query: ^10.45.0
 * - lucide-react: ^0.263.1
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Filter, Grid, List, User, Hash, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainNav } from "@/components/layout/main-nav";
import { api } from "@/trpc/react";

type SearchType = "all" | "posts" | "users" | "tags";
type ViewMode = "grid" | "list";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams?.get("q") || "");
  const [searchType, setSearchType] = useState<SearchType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // 搜索API调用
  const { data: searchResults, isPending } = api.post.search.useQuery(
    {
      query: query.trim(),
      type: searchType === "all" ? undefined : searchType,
      limit: 20,
    },
    {
      enabled: query.trim().length > 0,
    }
  );

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  // 更新URL参数
  useEffect(() => {
    const currentQuery = searchParams?.get("q") || "";
    if (currentQuery !== query) {
      setQuery(currentQuery);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <MainNav />

      <div className="container mx-auto px-4 py-8">
        {/* 搜索头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">搜索</h1>

          {/* 搜索框 */}
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="搜索内容、用户、标签..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 pr-4 h-12 text-lg"
            />
          </form>
        </div>

        {query.trim() ? (
          <>
            {/* 搜索结果头部 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold">
                  搜索结果: {`"${query}"`}
                </h2>
                {searchResults && (
                  <span className="text-muted-foreground">
                    找到 {searchResults.posts?.length || 0} 个结果
                  </span>
                )}
              </div>

              {/* 视图切换 */}
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 搜索结果标签页 */}
            <Tabs value={searchType} onValueChange={(value) => setSearchType(value as SearchType)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="flex items-center space-x-2">
                  <Search className="h-4 w-4" />
                  <span>全部</span>
                </TabsTrigger>
                <TabsTrigger value="posts" className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>内容</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>用户</span>
                </TabsTrigger>
                <TabsTrigger value="tags" className="flex items-center space-x-2">
                  <Hash className="h-4 w-4" />
                  <span>标签</span>
                </TabsTrigger>
              </TabsList>

              {/* 搜索结果内容 */}
              <div className="mt-6">
                {isPending ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardHeader>
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                        </CardHeader>
                        <CardContent>
                          <div className="h-32 bg-muted rounded mb-4"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : searchResults ? (
                  <TabsContent value="all" className="mt-0">
                    {searchResults.posts && searchResults.posts.length > 0 ? (
                      <div className={`grid gap-6 ${
                        viewMode === "grid"
                          ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                          : "grid-cols-1"
                      }`}>
                        {searchResults.posts.map((post) => (
                          <Card key={post.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                              <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span>@{post.author.username}</span>
                                <span>•</span>
                                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                              </div>
                            </CardHeader>
                            <CardContent>
                              {post.media && post.media.length > 0 && (
                                <div className="mb-4">
                                  <Image
                                    src={post.media[0].url}
                                    alt={post.title}
                                    width={400}
                                    height={192}
                                    className="w-full h-48 object-cover rounded-md"
                                  />
                                </div>
                              )}
                              <p className="text-muted-foreground line-clamp-3">
                                {post.content}
                              </p>
                              <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <span>{post.likeCount || 0} 点赞</span>
                                  <span>{post.commentCount || 0} 评论</span>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`/posts/${post.id}`}>查看详情</a>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">没有找到相关内容</h3>
                        <p className="text-muted-foreground">
                          尝试使用不同的关键词或浏览推荐内容
                        </p>
                      </div>
                    )}
                  </TabsContent>
                ) : null}
              </div>
            </Tabs>
          </>
        ) : (
          /* 搜索建议 */
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">热门搜索</h2>
              <div className="flex flex-wrap gap-2">
                {["cosplay", "写真", "动漫", "游戏", "二次元", "摄影"].map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery(tag);
                      router.push(`/search?q=${encodeURIComponent(tag)}`);
                    }}
                  >
                    #{tag}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">搜索建议</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>搜索内容</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      搜索cosplay作品、写真集、动态等内容
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>搜索用户</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      找到你感兴趣的创作者和朋友
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Hash className="h-5 w-5" />
                      <span>搜索标签</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      通过标签发现相关主题的内容
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
