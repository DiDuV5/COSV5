/**
 * @fileoverview 欢迎页面
 * @description 游客访问的欢迎页面，介绍平台功能和特色
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - next: ^14.0.0
 * - react: ^18.0.0
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Camera, 
  Heart, 
  MessageCircle, 
  Star, 
  Shield,
  Zap,
  Globe,
  Award,
  Sparkles
} from "lucide-react";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* 简化的导航栏 */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center">
              {/* 移除了logo，保留空白区域用于布局平衡 */}
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/signin">
                <Button variant="ghost">登录</Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  立即加入
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero 区域 */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              兔图
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              专业的 Cosplay 写真分享平台<br />
              <span className="text-lg text-gray-500">为 4600+ 付费用户提供高质量的内容分享和社交体验</span>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3">
                <Sparkles className="mr-2 h-5 w-5" />
                立即加入社区
              </Button>
            </Link>
            <Link href="/explore">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-3 border-2">
                <Globe className="mr-2 h-5 w-5" />
                探索精彩内容
              </Button>
            </Link>
          </div>

          {/* 统计数据 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">4600+</div>
              <div className="text-gray-600">付费用户</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">10K+</div>
              <div className="text-gray-600">精彩作品</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600 mb-2">50K+</div>
              <div className="text-gray-600">社区互动</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">99%</div>
              <div className="text-gray-600">用户满意度</div>
            </div>
          </div>
        </div>
      </section>

      {/* 特色功能 */}
      <section className="py-20 px-4 bg-white/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            为什么选择兔图？
          </h2>
          <p className="text-gray-600 text-center mb-12 text-lg">
            专为 Cosplay 爱好者打造的专业平台
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">专业创作工具</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  支持高清图片和视频上传，智能标签系统，专业的内容管理工具，让你的作品完美呈现
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">活跃社区</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  4600+ 付费用户的高质量社区，专业的 Coser 和摄影师，丰富的互动和学习机会
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-pink-50 to-pink-100">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl">会员权益</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-base">
                  灵活的会员体系，从基础到高级会员，享受不同权益，支持创作者获得收益
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 社区亮点 */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            社区亮点
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6 text-gray-800">
                专业的内容创作环境
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Heart className="h-6 w-6 text-red-500 mt-1" />
                  <div>
                    <h4 className="font-semibold">高质量内容</h4>
                    <p className="text-gray-600">严格的内容审核，确保社区内容质量</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MessageCircle className="h-6 w-6 text-blue-500 mt-1" />
                  <div>
                    <h4 className="font-semibold">深度互动</h4>
                    <p className="text-gray-600">专业的评论和反馈系统，促进创作者交流</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="h-6 w-6 text-green-500 mt-1" />
                  <div>
                    <h4 className="font-semibold">安全保障</h4>
                    <p className="text-gray-600">完善的隐私保护和内容安全机制</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">
                立即开始你的创作之旅
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                  <span>注册账号，完善个人资料</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                  <span>上传你的第一个作品</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                  <span>与社区成员互动交流</span>
                </div>
              </div>
              <Link href="/auth/signup">
                <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  开始创作
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="border-t bg-white/80 py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="mb-8">
            <div className="mb-4">
              {/* 移除了logo和平台名称 */}
            </div>
            <p className="text-gray-600">专业的 Cosplay 写真分享平台</p>
          </div>
          
          <div className="flex justify-center space-x-8 mb-8">
            <Link href="/about" className="text-gray-600 hover:text-gray-800 transition-colors">
              关于我们
            </Link>
            <Link href="/privacy" className="text-gray-600 hover:text-gray-800 transition-colors">
              隐私政策
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-gray-800 transition-colors">
              服务条款
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-gray-800 transition-colors">
              联系我们
            </Link>
          </div>
          
          <p className="text-gray-500">&copy; 2024 兔图. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
