/**
 * @fileoverview 下载平台配置管理
 * @description 定义支持的网盘平台类型、配置和验证逻辑
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - 无外部依赖
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

export interface DownloadPlatformSubType {
  id: string
  name: string
  description: string
  color?: string
  badge?: string
  specialNote?: string
}

export interface DownloadPlatform {
  id: string
  name: string
  icon: string
  color: string
  description: string
  needsExtractCode: boolean
  urlPattern?: RegExp
  features: string[]
  maxFileSize?: number // MB
  supportedFormats?: string[]
  subTypes?: DownloadPlatformSubType[]
  placeholder?: {
    url: string
    extractCode?: string
  }
}

export const DOWNLOAD_PLATFORMS: DownloadPlatform[] = [

  {
    id: 'baidu',
    name: '百度网盘',
    icon: '☁️',
    color: 'bg-blue-600',
    description: '大容量存储，需要提取码',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/pan\.baidu\.com\/.+/,
    features: ['大容量', '长期保存', '需要客户端'],
    maxFileSize: 10240,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://pan.baidu.com/s/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: 'aliyun',
    name: '阿里云盘',
    icon: '🌐',
    color: 'bg-orange-500',
    description: '高速下载，免费大容量',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/www\.aliyundrive\.com\/.+/,
    features: ['高速下载', '免费容量大', '不限速'],
    maxFileSize: 5120,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://www.aliyundrive.com/s/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: 'quark',
    name: '夸克网盘',
    icon: '⚡',
    color: 'bg-purple-500',
    description: '夸克浏览器网盘，速度快',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/pan\.quark\.cn\/.+/,
    features: ['高速下载', '移动优化', '简单易用'],
    maxFileSize: 2048,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://pan.quark.cn/s/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: 'xunlei',
    name: '迅雷网盘',
    icon: '⚡',
    color: 'bg-blue-700',
    description: '迅雷云盘，下载加速',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/(pan\.xunlei\.com|drive\.xunlei\.com)\/.+/,
    features: ['下载加速', '会员特权', '稳定存储'],
    maxFileSize: 5120,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://pan.xunlei.com/s/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: '123pan',
    name: '123云盘',
    icon: '📦',
    color: 'bg-green-500',
    description: '免费云存储，简单易用',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/www\.123pan\.com\/.+/,
    features: ['免费使用', '简单分享', '快速上传'],
    maxFileSize: 1024,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://www.123pan.com/s/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: 'tianyi',
    name: '天翼云盘',
    icon: '☁️',
    color: 'bg-red-500',
    description: '中国电信云盘服务',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/cloud\.189\.cn\/.+/,
    features: ['运营商服务', '稳定可靠', '大容量'],
    maxFileSize: 5120,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://cloud.189.cn/t/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    icon: '🌐',
    color: 'bg-blue-400',
    description: '微软云存储服务',
    needsExtractCode: false,
    urlPattern: /^https?:\/\/1drv\.ms\/.+/,
    features: ['国际服务', 'Office集成', '跨平台'],
    maxFileSize: 15360,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://1drv.ms/f/s!xxxxxxxxxx'
    }
  },
  {
    id: 'googledrive',
    name: 'Google Drive',
    icon: '🌐',
    color: 'bg-green-600',
    description: '谷歌云存储服务',
    needsExtractCode: false,
    urlPattern: /^https?:\/\/drive\.google\.com\/.+/,
    features: ['国际服务', 'Google集成', '协作功能'],
    maxFileSize: 15360,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://drive.google.com/drive/folders/xxxxxxxxxx'
    }
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: '📦',
    color: 'bg-blue-800',
    description: '国际知名云存储',
    needsExtractCode: false,
    urlPattern: /^https?:\/\/www\.dropbox\.com\/.+/,
    features: ['国际服务', '同步功能', '版本控制'],
    maxFileSize: 2048,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://www.dropbox.com/sh/xxxxxxxxxx'
    }
  },
  {
    id: 'mega',
    name: 'MEGA',
    icon: '🔒',
    color: 'bg-red-600',
    description: '加密云存储服务',
    needsExtractCode: false,
    urlPattern: /^https?:\/\/mega\.nz\/.+/,
    features: ['端到端加密', '隐私保护', '大容量'],
    maxFileSize: 5120,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://mega.nz/folder/xxxxxxxxxx'
    }
  },
  {
    id: 'lanzou',
    name: '蓝奏云',
    icon: '💙',
    color: 'bg-blue-300',
    description: '免费网盘，无需注册',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/(lanzou[a-z]?\.com|wwi\.lanzou[a-z]?\.com)\/.+/,
    features: ['免费使用', '无需注册', '永久保存'],
    maxFileSize: 100,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://wwi.lanzoup.com/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: 'ctfile',
    name: '城通网盘',
    icon: '🏢',
    color: 'bg-gray-600',
    description: '专业网盘服务',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/(ctfile\.com|474b\.com)\/.+/,
    features: ['专业服务', '稳定可靠', '批量下载'],
    maxFileSize: 2048,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://ctfile.com/fs/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: 'cowtransfer',
    name: '奶牛快传',
    icon: '🐄',
    color: 'bg-yellow-500',
    description: '临时文件传输',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/cowtransfer\.com\/.+/,
    features: ['临时传输', '大文件支持', '简单快捷'],
    maxFileSize: 2048,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://cowtransfer.com/s/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: 'pikpak',
    name: 'PikPak',
    icon: '📱',
    color: 'bg-indigo-500',
    description: '新兴云存储平台',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/mypikpak\.com\/.+/,
    features: ['新兴平台', '移动优先', '快速分享'],
    maxFileSize: 1024,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://mypikpak.com/s/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: '115',
    name: '115网盘',
    icon: '💾',
    color: 'bg-orange-600',
    description: '老牌网盘服务',
    needsExtractCode: true,
    urlPattern: /^https?:\/\/115\.com\/.+/,
    features: ['老牌服务', '稳定可靠', '会员特权'],
    maxFileSize: 5120,
    supportedFormats: ['*'],
    placeholder: {
      url: 'https://115.com/s/xxxxxxxxxx',
      extractCode: 'abcd'
    }
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: 'bg-blue-500',
    description: 'Telegram群组资源分享',
    needsExtractCode: false,
    urlPattern: /^https?:\/\/t\.me\/.+/,
    features: ['即时通讯', '群组分享', '社区互动'],
    maxFileSize: 2048,
    supportedFormats: ['*'],
    subTypes: [
      {
        id: 'telegram-public',
        name: '公开群组',
        description: '任何人都可以加入的公开群组',
        color: 'bg-green-100',
        badge: '公开'
      },
      {
        id: 'telegram-private',
        name: '私密群组',
        description: '需要邀请才能加入的私密群组',
        color: 'bg-orange-100',
        badge: '私密',
        specialNote: '此资源需要在专属社群中兑换，请联系管理员获取访问权限'
      }
    ],
    placeholder: {
      url: 'https://t.me/your_group_name'
    }
  },
  {
    id: 'custom',
    name: '自定义链接',
    icon: '🔗',
    color: 'bg-gray-500',
    description: '自定义下载链接',
    needsExtractCode: false,
    features: ['自定义', '灵活配置', '任意链接'],
    placeholder: {
      url: 'https://example.com/download/xxxxxxxxxx'
    }
  }
]

export function getPlatformById(id: string): DownloadPlatform | undefined {
  return DOWNLOAD_PLATFORMS.find(platform => platform.id === id)
}

export function getPlatformSubTypeById(platformId: string, subTypeId: string): DownloadPlatformSubType | undefined {
  const platform = getPlatformById(platformId)
  return platform?.subTypes?.find(subType => subType.id === subTypeId)
}

export function getPlatformWithSubTypes(): DownloadPlatform[] {
  return DOWNLOAD_PLATFORMS.filter(platform => platform.subTypes && platform.subTypes.length > 0)
}

export function detectPlatformByUrl(url: string): DownloadPlatform | undefined {
  for (const platform of DOWNLOAD_PLATFORMS) {
    if (platform.urlPattern && platform.urlPattern.test(url)) {
      return platform
    }
  }
  return getPlatformById('custom')
}

export function validateDownloadUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
