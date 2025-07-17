'use client'

import { useState, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { TurnstileWidget } from './security/turnstile-widget'
import type { TurnstileWidgetRef } from '@/types/turnstile'

interface LoginFormProps {
  callbackUrl?: string
  className?: string
}

export default function LoginForm({ callbackUrl, className = '' }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [turnstileToken, setTurnstileToken] = useState<string>('')
  const [isTurnstileVerified, setIsTurnstileVerified] = useState(false)

  const turnstileRef = useRef<TurnstileWidgetRef>(null)

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token)
    setIsTurnstileVerified(true)
    setError(undefined)
  }

  const handleTurnstileError = (error: string) => {
    setTurnstileToken('')
    setIsTurnstileVerified(false)
    setError('安全验证失败，请重试')
  }

  const handleTurnstileExpire = () => {
    setTurnstileToken('')
    setIsTurnstileVerified(false)
    setError('安全验证已过期，请重新验证')
  }

  const resetTurnstile = () => {
    turnstileRef.current?.reset()
    setTurnstileToken('')
    setIsTurnstileVerified(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError('请填写邮箱和密码')
      return
    }

    if (!isTurnstileVerified) {
      setError('请完成安全验证')
      return
    }

    setIsLoading(true)
    setError(undefined)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        turnstileToken,
        redirect: false,
      })

      if (result?.error) {
        setError('登录失败，请检查邮箱和密码')
        resetTurnstile()
      } else if (result?.ok) {
        // 登录成功，重定向
        window.location.href = callbackUrl || '/dashboard'
      }
    } catch (err) {
      setError('登录过程中发生错误，请重试')
      resetTurnstile()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            登录 CoserEden
          </h2>
          <p className="mt-2 text-sm text-gray-600 text-center">
            欢迎回到专业Cosplay创作者平台
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 邮箱输入 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              邮箱地址
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入邮箱地址"
              disabled={isLoading}
            />
          </div>

          {/* 密码输入 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="请输入密码"
              disabled={isLoading}
            />
          </div>

          {/* Turnstile验证 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              安全验证
            </label>
            <TurnstileWidget
              ref={turnstileRef}
              sitekey={process.env.COSEREEDEN_TURNSTILE_SITE_KEY || ''}
              onSuccess={handleTurnstileSuccess}
              onError={handleTurnstileError}
              onExpired={handleTurnstileExpire}
              theme="auto"
              size="normal"
            />
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={isLoading || !isTurnstileVerified}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                登录中...
              </div>
            ) : (
              '登录'
            )}
          </button>
        </form>

        {/* 其他登录选项 */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">或</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            {/* GitHub登录 */}
            <button
              type="button"
              onClick={() => signIn('github', { callbackUrl })}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-2">使用 GitHub 登录</span>
            </button>
          </div>
        </div>

        {/* 注册链接 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            还没有账号？{' '}
            <a href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              立即注册
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
