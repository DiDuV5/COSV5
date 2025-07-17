/**
 * @fileoverview 数据加密解密服务
 * @description 提供下载链接和提取码的加密解密功能
 * @author Augment AI
 * @date 2024-01-XX
 * @version 1.0.0
 * @since 1.0.0
 *
 * @dependencies
 * - crypto (Node.js 内置模块)
 *
 * @changelog
 * - 2024-01-XX: 初始版本创建
 */

import crypto from 'crypto'

// 从环境变量获取加密密钥，生产环境必须设置
const ENCRYPTION_KEY = process.env.COSEREEDEN_ENCRYPTION_KEY || 'tu-cosplay-platform-default-key-change-in-production'
const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // AES-256-CBC 的 IV 长度

/**
 * 生成加密密钥的哈希值
 */
function getKeyHash(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
}

/**
 * 加密文本数据
 * @param text 要加密的文本
 * @returns 加密后的字符串 (格式: iv:tag:encryptedData)
 */
export function encrypt(text: string): string {
  if (!text) return ''

  try {
    const key = getKeyHash()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // 返回格式: iv:encryptedData (都是十六进制)
    return `${iv.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('加密失败:', error)
    // 降级到 base64 编码
    return Buffer.from(text, 'utf8').toString('base64')
  }
}

/**
 * 解密文本数据
 * @param encryptedText 加密的文本
 * @returns 解密后的原始文本
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''

  try {
    // 检查是否是新的加密格式
    if (encryptedText.includes(':')) {
      const parts = encryptedText.split(':')
      if (parts.length === 2) {
        const [ivHex, encrypted] = parts
        const key = getKeyHash()
        const iv = Buffer.from(ivHex, 'hex')
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

        let decrypted = decipher.update(encrypted, 'hex', 'utf8')
        decrypted += decipher.final('utf8')

        return decrypted
      }
    }

    // 降级到 base64 解码
    return Buffer.from(encryptedText, 'base64').toString('utf8')
  } catch (error) {
    console.error('解密失败:', error)
    return ''
  }
}

/**
 * 生成随机访问令牌
 * @param length 令牌长度
 * @returns 十六进制格式的随机令牌
 */
export function generateAccessToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * 生成安全的随机字符串
 * @param length 字符串长度
 * @param charset 字符集
 * @returns 随机字符串
 */
export function generateSecureRandom(
  length: number = 16,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  const bytes = crypto.randomBytes(length)
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length]
  }
  
  return result
}

/**
 * 计算文本的哈希值
 * @param text 要计算哈希的文本
 * @param algorithm 哈希算法
 * @returns 哈希值
 */
export function calculateHash(text: string, algorithm: string = 'sha256'): string {
  return crypto.createHash(algorithm).update(text, 'utf8').digest('hex')
}

/**
 * 验证加密文本的完整性
 * @param encryptedText 加密的文本
 * @returns 是否为有效的加密格式
 */
export function isValidEncryptedFormat(encryptedText: string): boolean {
  if (!encryptedText) return false

  // 检查是否是新的加密格式
  if (encryptedText.includes(':')) {
    const parts = encryptedText.split(':')
    if (parts.length === 2) {
      try {
        // 验证各部分是否为有效的十六进制
        Buffer.from(parts[0], 'hex') // IV
        Buffer.from(parts[1], 'hex') // Encrypted data
        return true
      } catch {
        return false
      }
    }
  }

  // 检查是否是 base64 格式
  try {
    Buffer.from(encryptedText, 'base64')
    return true
  } catch {
    return false
  }
}

/**
 * 批量加密多个字段
 * @param data 包含要加密字段的对象
 * @param fields 要加密的字段名数组
 * @returns 加密后的对象
 */
export function encryptFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data }
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as T[keyof T]
    }
  }
  
  return result
}

/**
 * 批量解密多个字段
 * @param data 包含要解密字段的对象
 * @param fields 要解密的字段名数组
 * @returns 解密后的对象
 */
export function decryptFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data }
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decrypt(result[field] as string) as T[keyof T]
    }
  }
  
  return result
}

/**
 * 安全比较两个字符串（防止时序攻击）
 * @param a 字符串A
 * @param b 字符串B
 * @returns 是否相等
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}
