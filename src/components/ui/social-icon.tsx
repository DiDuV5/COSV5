/**
 * @component SocialIcon
 * @description 社交媒体图标组件，支持多种平台的图标显示
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 *
 * @props
 * - platform: string - 社交平台类型
 * - size?: 'sm' | 'md' | 'lg' - 图标尺寸
 * - variant?: 'default' | 'outline' | 'filled' - 显示变体
 * - customIcon?: string - 自定义图标名称
 * - className?: string - 自定义样式类名
 *
 * @example
 * <SocialIcon
 *   platform="GITHUB"
 *   size="md"
 *   variant="filled"
 * />
 *
 * @dependencies
 * - React 18+
 * - lucide-react icons
 * - tailwindcss
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

"use client";

import { 
  MessageCircle,
  Twitter,
  Instagram,
  Youtube,
  Github,
  Link,
  Globe,
  Music,
  Video,
  BookOpen,
  ExternalLink
} from "lucide-react";

import { SOCIAL_PLATFORMS } from "@/types/profile";
import { cn } from "@/lib/utils";

interface SocialIconProps {
  platform: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'filled';
  customIcon?: string;
  className?: string;
}

// 图标映射
const PLATFORM_ICONS = {
  TELEGRAM: MessageCircle,
  WEIBO: MessageCircle, // 微博暂用消息图标
  TWITTER: Twitter,
  INSTAGRAM: Instagram,
  TIKTOK: Music, // TikTok暂用音乐图标
  YOUTUBE: Youtube,
  BILIBILI: Video, // B站暂用视频图标
  GITHUB: Github,
  ZHIHU: BookOpen, // 知乎暂用书本图标
  CUSTOM: Link,
} as const;

// 自定义图标映射
const CUSTOM_ICONS = {
  link: Link,
  globe: Globe,
  external: ExternalLink,
  music: Music,
  video: Video,
  book: BookOpen,
} as const;

export function SocialIcon({
  platform,
  size = 'md',
  variant = 'default',
  customIcon,
  className,
}: SocialIconProps) {
  // 获取平台配置
  const platformConfig = SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS];
  
  // 获取图标组件
  const getIconComponent = () => {
    // 如果是自定义链接且有自定义图标
    if (platform === 'CUSTOM' && customIcon) {
      return CUSTOM_ICONS[customIcon as keyof typeof CUSTOM_ICONS] || Link;
    }
    
    // 使用平台默认图标
    return PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS] || Link;
  };

  const IconComponent = getIconComponent();

  // 尺寸配置
  const sizeConfig = {
    sm: {
      icon: "h-4 w-4",
      container: "w-6 h-6",
    },
    md: {
      icon: "h-5 w-5",
      container: "w-8 h-8",
    },
    lg: {
      icon: "h-6 w-6",
      container: "w-10 h-10",
    },
  };

  // 变体配置
  const getVariantStyles = () => {
    const baseColor = platformConfig?.color || "#6b7280";
    
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: baseColor,
          color: 'white',
        };
      case 'outline':
        return {
          borderColor: baseColor,
          color: baseColor,
          backgroundColor: 'transparent',
        };
      default:
        return {
          color: baseColor,
          backgroundColor: 'transparent',
        };
    }
  };

  const variantStyles = getVariantStyles();
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center transition-all duration-200",
        config.container,
        variant === 'outline' && "border-2",
        variant === 'filled' && "shadow-sm",
        className
      )}
      style={variantStyles}
    >
      <IconComponent className={config.icon} />
    </div>
  );
}

// 社交平台颜色获取函数
export function getSocialPlatformColor(platform: string): string {
  const platformConfig = SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS];
  return platformConfig?.color || "#6b7280";
}

// 社交平台名称获取函数
export function getSocialPlatformName(platform: string): string {
  const platformConfig = SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS];
  return platformConfig?.name || "未知平台";
}

// 社交平台图标组件（简化版）
export function SimpleSocialIcon({ 
  platform, 
  className 
}: { 
  platform: string; 
  className?: string; 
}) {
  return (
    <SocialIcon
      platform={platform}
      size="sm"
      variant="filled"
      className={className}
    />
  );
}

// 社交平台图标列表组件
export function SocialIconList({ 
  platforms, 
  size = 'md',
  className 
}: { 
  platforms: string[]; 
  size?: 'sm' | 'md' | 'lg';
  className?: string; 
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {platforms.map((platform, index) => (
        <SocialIcon
          key={index}
          platform={platform}
          size={size}
          variant="filled"
        />
      ))}
    </div>
  );
}
