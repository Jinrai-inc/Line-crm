"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "メールアドレスまたはパスワードが正しくありません"
            : error.message
        )
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError("")
    setResetLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setResetError(error.message)
        return
      }

      setResetSent(true)
    } catch {
      setResetError("送信に失敗しました。もう一度お試しください。")
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="text-2xl font-bold text-foreground">LINE CRM</span>
          </div>
          <p className="text-muted-foreground text-sm">
            {resetMode ? "パスワードをリセット" : "管理システムにログイン"}
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {resetMode ? (
            /* パスワードリセットフォーム */
            resetSent ? (
              <div className="text-center space-y-4">
                <div className="text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg p-4">
                  パスワードリセットメールを送信しました。メール内のリンクからパスワードを変更してください。
                </div>
                <button
                  type="button"
                  onClick={() => { setResetMode(false); setResetSent(false); setResetEmail("") }}
                  className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  ログインに戻る
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                {resetError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                    {resetError}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
                </p>
                <div className="space-y-2">
                  <label htmlFor="reset-email" className="block text-sm font-medium text-foreground">
                    メールアドレス
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="mail@example.com"
                    required
                    className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full h-11 rounded-lg bg-primary text-white font-medium text-sm hover:bg-[#04A847] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      送信中...
                    </>
                  ) : (
                    "リセットメールを送信"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetMode(false); setResetError("") }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition inline-flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} />
                  ログインに戻る
                </button>
              </form>
            )
          ) : (
            /* ログインフォーム */
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mail@example.com"
                  required
                  className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  パスワード
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    required
                    className="w-full h-11 px-4 pr-11 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="text-xs text-muted-foreground hover:text-primary transition"
                >
                  パスワードをお忘れですか？
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary text-white font-medium text-sm hover:bg-[#04A847] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  "ログイン"
                )}
              </button>
            </form>
          )}
        </div>

        {/* サインアップリンク */}
        {!resetMode && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            アカウントをお持ちでない方は{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              新規登録
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
