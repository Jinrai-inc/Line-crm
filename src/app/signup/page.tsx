"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const [organizationName, setOrganizationName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const supabase = createClient()

      // 1. Supabase Authでユーザー作成
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            organization_name: organizationName,
          },
        },
      })

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("このメールアドレスは既に登録されています")
        } else {
          setError(authError.message)
        }
        return
      }

      if (!authData.user) {
        setError("ユーザーの作成に失敗しました")
        return
      }

      // 2. 組織を作成
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({ name: organizationName })
        .select()
        .single()

      if (orgError) {
        setError("組織の作成に失敗しました: " + orgError.message)
        return
      }

      // 3. usersテーブルにレコード作成
      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        organization_id: org.id,
        email,
        display_name: displayName,
        role: "owner",
      })

      if (userError) {
        setError("ユーザー情報の保存に失敗しました: " + userError.message)
        return
      }

      router.push("/onboarding")
      router.refresh()
    } catch {
      setError("登録に失敗しました。もう一度お試しください。")
    } finally {
      setLoading(false)
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
            <span className="text-2xl font-bold text-foreground">LINE connect CRM</span>
          </div>
          <p className="text-muted-foreground text-sm">新しいアカウントを作成</p>
        </div>

        {/* サインアップフォーム */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="orgName" className="block text-sm font-medium text-foreground">
                組織名
              </label>
              <input
                id="orgName"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="株式会社サンプル"
                required
                className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
                表示名
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="山田太郎"
                required
                className="w-full h-11 px-4 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>

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
                  placeholder="8文字以上のパスワード"
                  required
                  minLength={8}
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
              <p className="text-xs text-muted-foreground">8文字以上で設定してください</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-primary text-white font-medium text-sm hover:bg-[#04A847] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  登録中...
                </>
              ) : (
                "アカウントを作成"
              )}
            </button>
          </form>
        </div>

        {/* ログインリンク */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          既にアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}
