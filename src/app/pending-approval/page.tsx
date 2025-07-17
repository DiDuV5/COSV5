/**
 * @fileoverview 待审核页面
 * @description 用户注册后等待审核的页面
 * @author Augment AI
 * @date 2025-06-22
 * @version 1.0.0
 * @since 1.0.0
 */

import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PendingApprovalPage } from "@/components/auth/PendingApprovalPage";

export default async function PendingApproval() {
  const session = await getServerSession(authOptions);

  // 如果没有登录，重定向到登录页
  if (!session) {
    redirect("/auth/signin");
  }

  // 如果用户已经通过审核，重定向到首页
  if (session.user.approvalStatus === "APPROVED") {
    redirect("/");
  }

  return (
    <PendingApprovalPage
      userApprovalStatus={session.user.approvalStatus}
      userEmail={session.user.email || undefined}
      userName={session.user.username}
    />
  );
}

export const metadata = {
  title: "等待审核 - CoserEden",
  description: "您的账号正在等待管理员审核",
};
