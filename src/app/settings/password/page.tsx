/**
 * @fileoverview 密码设置页面
 * @description 用户密码修改页面
 * @author Augment AI
 * @date 2025-07-03
 * @version 1.0.0
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

import { getServerAuthSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PasswordChange } from "@/components/settings/password-change";

export const metadata: Metadata = {
  title: "密码设置 - CoserEden",
  description: "修改您的账户密码",
};

export default async function PasswordSettingsPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/settings/password");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回设置
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              密码设置
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              修改您的账户密码以保护账户安全
            </p>
          </div>
        </div>
      </div>

      {/* 密码修改组件 */}
      <PasswordChange />
    </div>
  );
}
