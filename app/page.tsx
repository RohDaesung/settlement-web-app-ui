'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type ProfileRole = 'admin' | 'manager' | 'buyer'
type ProfileStatus = 'pending' | 'approved'

type Profile = {
  id: string
  username: string
  name: string
  requested_brand_name: string | null
  role: ProfileRole
  status: ProfileStatus
}

const PROFILE_CACHE_KEY = 'KHAN_PORTAL_PROFILE_CACHE'
const REMEMBER_USERNAME_KEY = 'KHAN_PORTAL_REMEMBERED_USERNAME'
const REMEMBER_USERNAME_ENABLED_KEY = 'KHAN_PORTAL_REMEMBERED_USERNAME_ENABLED'

function withTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    }),
  ])
}

export default function HomePage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberUsername, setRememberUsername] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [message, setMessage] = useState('')

  const saveProfileCache = (nextProfile: Profile | null) => {
    try {
      if (!nextProfile) {
        localStorage.removeItem(PROFILE_CACHE_KEY)
        return
      }
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(nextProfile))
    } catch (error) {
      console.error('saveProfileCache error:', error)
    }
  }

  const readProfileCache = (): Profile | null => {
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as Profile
    } catch (error) {
      console.error('readProfileCache error:', error)
      return null
    }
  }

  const clearProfileCache = () => {
    try {
      localStorage.removeItem(PROFILE_CACHE_KEY)
    } catch (error) {
      console.error('clearProfileCache error:', error)
    }
  }

  const saveRememberedUsername = (nextUsername: string, enabled: boolean) => {
    try {
      if (!enabled) {
        localStorage.removeItem(REMEMBER_USERNAME_KEY)
        localStorage.setItem(REMEMBER_USERNAME_ENABLED_KEY, 'false')
        return
      }

      localStorage.setItem(REMEMBER_USERNAME_KEY, nextUsername)
      localStorage.setItem(REMEMBER_USERNAME_ENABLED_KEY, 'true')
    } catch (error) {
      console.error('saveRememberedUsername error:', error)
    }
  }

  const restoreRememberedUsername = () => {
    try {
      const enabled =
        localStorage.getItem(REMEMBER_USERNAME_ENABLED_KEY) === 'true'
      const savedUsername =
        localStorage.getItem(REMEMBER_USERNAME_KEY) ?? ''

      setRememberUsername(enabled)

      if (enabled && savedUsername) {
        setUsername(savedUsername)
      }
    } catch (error) {
      console.error('restoreRememberedUsername error:', error)
    }
  }

  const clearRememberedUsername = () => {
    try {
      localStorage.removeItem(REMEMBER_USERNAME_KEY)
      localStorage.setItem(REMEMBER_USERNAME_ENABLED_KEY, 'false')
    } catch (error) {
      console.error('clearRememberedUsername error:', error)
    }
  }

  const loadProfileByUserId = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, name, requested_brand_name, role, status')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('profile load error:', error)
      return null
    }

    if (!data) return null
    return data as Profile
  }

  const restoreCurrentSession = async () => {
    try {
      const authData = await withTimeout(supabase.auth.getUser(), 3000)

      if (!authData.data.user) {
        setProfile(null)
        clearProfileCache()
        return
      }

      const foundProfile = await loadProfileByUserId(authData.data.user.id)

      if (!foundProfile) {
        await supabase.auth.signOut()
        setProfile(null)
        clearProfileCache()
        return
      }

      if (foundProfile.status !== 'approved') {
        await supabase.auth.signOut()
        setProfile(null)
        clearProfileCache()
        return
      }

      setProfile(foundProfile)
      saveProfileCache(foundProfile)
      setMessage('')
    } catch (error) {
      console.error('restoreCurrentSession error:', error)
      const cachedProfile = readProfileCache()
      if (cachedProfile) {
        setProfile(cachedProfile)
      }
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => {
    const cachedProfile = readProfileCache()
    if (cachedProfile) {
      setProfile(cachedProfile)
    }

    restoreRememberedUsername()
    restoreCurrentSession()
  }, [])

  const handleLogin = async () => {
    if (!username.trim()) {
      setMessage('아이디를 입력해주세요.')
      return
    }

    if (!password.trim()) {
      setMessage('비밀번호를 입력해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const trimmedUsername = username.trim()

      const checkRes = await fetch('/api/auth/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername }),
      })

      const checkData = await checkRes.json()

      if (!checkRes.ok) {
        setMessage(checkData?.error || '계정 확인 중 오류가 발생했습니다.')
        return
      }

      if (!checkData.exists) {
        setMessage('존재하지 않는 아이디입니다.')
        return
      }

      if (checkData.status === 'pending') {
        setMessage('승인 대기 계정입니다.')
        return
      }

      if (checkData.status !== 'approved') {
        setMessage('로그인할 수 없는 계정 상태입니다.')
        return
      }

      const email = `${trimmedUsername}@local.com`

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.user) {
        console.error('signIn error:', error)
        setMessage('아이디 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      const foundProfile = await loadProfileByUserId(data.user.id)

      if (!foundProfile) {
        await supabase.auth.signOut()
        setMessage('프로필 정보를 불러올 수 없습니다.')
        return
      }

      if (foundProfile.status !== 'approved') {
        await supabase.auth.signOut()
        setMessage('승인되지 않은 계정입니다.')
        return
      }

      if (rememberUsername) {
        saveRememberedUsername(trimmedUsername, true)
      } else {
        clearRememberedUsername()
      }

      setProfile(foundProfile)
      saveProfileCache(foundProfile)
      setPassword('')
      setMessage('')
    } catch (error) {
      console.error('login error:', error)
      setMessage('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await handleLogin()
  }

  const handleToggleRememberUsername = () => {
    const next = !rememberUsername
    setRememberUsername(next)

    if (!next) {
      clearRememberedUsername()
    } else if (username.trim()) {
      saveRememberedUsername(username.trim(), true)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    setMessage('')

    try {
      await supabase.auth.signOut()
      setProfile(null)
      clearProfileCache()
    } catch (error) {
      console.error('logout error:', error)
      setMessage('로그아웃 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleMoveSettlement = () => router.push('/settlement')
  const handleMoveMarginAnalysis = () => router.push('/margin-analysis')
  const handleMoveShipment = () => router.push('/shipment-management')
  const handleMoveAdminUsers = () => router.push('/admin/users')

  const roleLabel = useMemo(() => {
    if (!profile) return ''
    if (profile.role === 'admin') return '총운영자'
    if (profile.role === 'manager') return '부운영자'
    return '바이어'
  }, [profile])

  const roleDescription = useMemo(() => {
    if (!profile) return ''

    if (profile.role === 'admin') {
      return '정산표, 마진분석, 출고관리 페이지에 모두 접근할 수 있습니다.'
    }

    if (profile.role === 'manager') {
      return '출고관리 페이지에 접근할 수 있으며 수정 및 삭제가 가능합니다.'
    }

    return ''
  }, [profile])

  if (authLoading && !profile) {
    return (
      <>
        <style>{`
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background:
              radial-gradient(circle at top left, rgba(120, 95, 62, 0.08), transparent 34%),
              linear-gradient(180deg, #f7f3ee 0%, #f3eee8 100%);
            color: #211d19;
            font-family: Arial, sans-serif;
          }
          body { word-break: keep-all; }

          .page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }

          .topbar {
            border-bottom: 1px solid rgba(74, 61, 48, 0.08);
            background: rgba(248, 245, 241, 0.72);
            backdrop-filter: blur(18px);
          }

          .topbar-inner,
          .footer-inner {
            width: 100%;
            max-width: 1280px;
            margin: 0 auto;
            padding: 18px 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .brand-wrap {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .brand-mark {
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(33, 29, 25, 0.9);
            background: #211d19;
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.04em;
          }

          .brand-name {
            font-size: 16px;
            font-weight: 700;
            color: #1f1b17;
          }

          .brand-sub {
            margin-top: 4px;
            font-size: 11px;
            color: #857464;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .main {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }

          .loading-card {
            width: 100%;
            max-width: 420px;
            padding: 28px 24px;
            border: 1px solid rgba(63, 52, 43, 0.12);
            background: rgba(255, 255, 255, 0.82);
            backdrop-filter: blur(14px);
            box-shadow: 0 20px 50px rgba(38, 30, 23, 0.06);
          }

          .loading-label {
            font-size: 11px;
            letter-spacing: 0.18em;
            font-weight: 700;
            color: #8a7867;
            text-transform: uppercase;
            margin-bottom: 10px;
          }

          .loading-text {
            font-size: 15px;
            line-height: 1.8;
            color: #4e4338;
          }

          .footer {
            border-top: 1px solid rgba(74, 61, 48, 0.08);
            background: rgba(250, 247, 243, 0.62);
            backdrop-filter: blur(10px);
          }

          .footer-inner {
            font-size: 12px;
            color: #8a7a6a;
          }

          @media (max-width: 700px) {
            .topbar-inner,
            .footer-inner {
              padding-left: 16px;
              padding-right: 16px;
            }
          }
        `}</style>

        <div className="page">
          <header className="topbar">
            <div className="topbar-inner">
              <div className="brand-wrap">
                <div className="brand-mark">KH</div>
                <div>
                  <div className="brand-name">Khan Apparel</div>
                  <div className="brand-sub">Buyer Portal</div>
                </div>
              </div>
            </div>
          </header>

          <main className="main">
            <div className="loading-card">
              <div className="loading-label">Khan Apparel</div>
              <div className="loading-text">로그인 상태를 확인하는 중입니다...</div>
            </div>
          </main>

          <footer className="footer">
            <div className="footer-inner">
              <span>© 2026 Khan Apparel Inc.</span>
              <span>Buyer Portal</span>
            </div>
          </footer>
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <style>{`
          * { box-sizing: border-box; }

          html, body {
            margin: 0;
            padding: 0;
            background:
              radial-gradient(circle at top left, rgba(120, 95, 62, 0.09), transparent 32%),
              radial-gradient(circle at bottom right, rgba(93, 72, 48, 0.06), transparent 28%),
              linear-gradient(180deg, #f8f5f1 0%, #f2ece5 100%);
            color: #211d19;
            font-family: Arial, sans-serif;
          }

          body { word-break: keep-all; }

          .page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }

          .topbar {
            border-bottom: 1px solid rgba(74, 61, 48, 0.08);
            background: rgba(248, 245, 241, 0.72);
            backdrop-filter: blur(18px);
          }

          .topbar-inner {
            width: 100%;
            max-width: 1280px;
            margin: 0 auto;
            padding: 22px 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .brand-wrap {
            display: flex;
            align-items: center;
            gap: 14px;
            min-width: 0;
          }

          .brand-mark {
            width: 46px;
            height: 46px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(33, 29, 25, 0.9);
            background: #211d19;
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.04em;
          }

          .brand-text {
            min-width: 0;
          }

          .brand-name {
            font-size: 17px;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.2;
            color: #1f1b17;
          }

          .brand-sub {
            margin-top: 4px;
            font-size: 12px;
            color: #857464;
            line-height: 1.3;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .main {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px 20px;
          }

          .login-shell {
            width: 100%;
            max-width: 460px;
            position: relative;
          }

          .login-shell::before {
            content: '';
            position: absolute;
            inset: 18px -18px -18px 18px;
            background: rgba(88, 72, 56, 0.06);
            z-index: 0;
          }

          .login-card {
            position: relative;
            z-index: 1;
            border: 1px solid rgba(68, 57, 47, 0.12);
            background: rgba(255, 255, 255, 0.86);
            backdrop-filter: blur(16px);
            padding: 36px 30px 28px;
            box-shadow: 0 24px 60px rgba(34, 27, 21, 0.08);
          }

          .card-kicker {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #8e7b69;
            margin-bottom: 10px;
          }

          .card-title {
            margin: 0 0 10px;
            font-size: 34px;
            font-weight: 700;
            letter-spacing: -0.05em;
            line-height: 1.08;
            color: #1f1b17;
          }

          .card-sub {
            margin: 0 0 24px;
            font-size: 14px;
            line-height: 1.85;
            color: #6d5f52;
          }

          .form { display: block; }

          .field { margin-bottom: 14px; }

          .field label {
            display: block;
            margin-bottom: 8px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #7f6d5c;
          }

          .field input {
            width: 100%;
            height: 54px;
            padding: 0 16px;
            border: 1px solid rgba(84, 68, 54, 0.14);
            background: rgba(255, 255, 255, 0.94);
            color: #1f1b17;
            outline: none;
            font-size: 15px;
            transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          }

          .field input:focus {
            border-color: rgba(33, 29, 25, 0.42);
            box-shadow: 0 0 0 4px rgba(51, 42, 34, 0.05);
            background: #fff;
          }

          .remember-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin: 6px 0 18px;
          }

          .remember-label {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            user-select: none;
            color: #53483d;
            font-size: 13px;
            font-weight: 600;
          }

          .remember-input {
            position: absolute;
            opacity: 0;
            pointer-events: none;
          }

          .remember-box {
            width: 18px;
            height: 18px;
            border: 1px solid rgba(84, 68, 54, 0.24);
            background: rgba(255, 255, 255, 0.86);
            position: relative;
            transition: all 0.18s ease;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
            flex-shrink: 0;
          }

          .remember-input:checked + .remember-box {
            background: #211d19;
            border-color: #211d19;
          }

          .remember-input:checked + .remember-box::after {
            content: '';
            position: absolute;
            left: 5px;
            top: 2px;
            width: 4px;
            height: 8px;
            border: solid #fff;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
          }

          .remember-text {
            line-height: 1;
          }

          .primary-btn,
          .secondary-btn {
            width: 100%;
            min-height: 54px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.02em;
            cursor: pointer;
            transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
          }

          .primary-btn {
            margin-top: 2px;
            border: 1px solid #211d19;
            background: #211d19;
            color: #fff;
          }

          .primary-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 12px 24px rgba(33, 29, 25, 0.16);
          }

          .primary-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .divider {
            height: 1px;
            margin: 18px 0;
            background: linear-gradient(
              90deg,
              rgba(120, 102, 83, 0) 0%,
              rgba(120, 102, 83, 0.24) 15%,
              rgba(120, 102, 83, 0.24) 85%,
              rgba(120, 102, 83, 0) 100%
            );
          }

          .secondary-btn {
            border: 1px solid rgba(84, 68, 54, 0.14);
            background: rgba(255, 255, 255, 0.72);
            color: #241f1a;
          }

          .secondary-btn:hover {
            transform: translateY(-1px);
            background: #fff;
          }

          .message {
            margin-top: 16px;
            padding: 14px 15px;
            border: 1px solid rgba(168, 87, 72, 0.18);
            background: rgba(250, 241, 236, 0.92);
            font-size: 13px;
            line-height: 1.8;
            color: #a24e43;
          }

          .notice {
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid rgba(84, 68, 54, 0.1);
          }

          .notice-title {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #7e6d5d;
            margin-bottom: 8px;
          }

          .notice-desc {
            font-size: 12px;
            line-height: 1.85;
            color: #796d61;
          }

          .footer {
            border-top: 1px solid rgba(74, 61, 48, 0.08);
            background: rgba(250, 247, 243, 0.62);
            backdrop-filter: blur(10px);
          }

          .footer-inner {
            width: 100%;
            max-width: 1280px;
            margin: 0 auto;
            padding: 18px 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            font-size: 12px;
            color: #8a7a6a;
          }

          @media (max-width: 700px) {
            .topbar-inner,
            .footer-inner {
              padding-left: 16px;
              padding-right: 16px;
            }

            .main {
              padding: 20px 14px;
            }

            .login-shell::before {
              inset: 12px -8px -8px 12px;
            }

            .login-card {
              padding: 28px 18px 22px;
            }

            .card-title {
              font-size: 28px;
            }

            .field input,
            .primary-btn,
            .secondary-btn {
              min-height: 50px;
            }
          }
        `}</style>

        <div className="page">
          <header className="topbar">
            <div className="topbar-inner">
              <div className="brand-wrap">
                <div className="brand-mark">KH</div>
                <div className="brand-text">
                  <div className="brand-name">Khan Apparel</div>
                  <div className="brand-sub">Buyer Portal</div>
                </div>
              </div>
            </div>
          </header>

          <main className="main">
            <section className="login-shell">
              <div className="login-card">
                <div className="card-kicker">Secure Login</div>
                <h1 className="card-title">로그인</h1>
                <p className="card-sub">
                  계정 정보를 입력하고 포털에 접속하세요.
                </p>

                <form className="form" onSubmit={handleLoginSubmit}>
                  <div className="field">
                    <label htmlFor="username">Username</label>
                    <input
                      id="username"
                      value={username}
                      onChange={(e) => {
                        const nextValue = e.target.value
                        setUsername(nextValue)

                        if (rememberUsername) {
                          saveRememberedUsername(nextValue.trim(), true)
                        }
                      }}
                      autoComplete="username"
                      placeholder="아이디를 입력하세요"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="비밀번호를 입력하세요"
                    />
                  </div>

                  <div className="remember-row">
                    <label className="remember-label">
                      <input
                        className="remember-input"
                        type="checkbox"
                        checked={rememberUsername}
                        onChange={handleToggleRememberUsername}
                      />
                      <span className="remember-box" />
                      <span className="remember-text">아이디 기억하기</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={loading}
                  >
                    {loading ? '처리 중...' : '로그인'}
                  </button>
                </form>

                <div className="divider" />

                <Link href="/signup" className="secondary-btn">
                  신규 계정 신청
                </Link>

                {message && <div className="message">{message}</div>}

                <div className="notice">
                  <div className="notice-title">Approval Notice</div>
                  <div className="notice-desc">
                    신규 가입 후 관리자 승인 완료 시 로그인할 수 있습니다.
                    승인되지 않은 계정은 접속이 제한됩니다.
                  </div>
                </div>
              </div>
            </section>
          </main>

          <footer className="footer">
            <div className="footer-inner">
              <span>© 2026 Khan Apparel Inc.</span>
              <span>Buyer Portal</span>
            </div>
          </footer>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        html, body {
          margin: 0;
          padding: 0;
          background:
            radial-gradient(circle at top left, rgba(120, 95, 62, 0.08), transparent 34%),
            radial-gradient(circle at bottom right, rgba(93, 72, 48, 0.06), transparent 28%),
            linear-gradient(180deg, #f8f5f1 0%, #f2ece5 100%);
          color: #211d19;
          font-family: Arial, sans-serif;
        }

        body { word-break: keep-all; }

        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 1px solid rgba(74, 61, 48, 0.08);
          background: rgba(248, 245, 241, 0.72);
          backdrop-filter: blur(18px);
        }

        .topbar-inner {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 22px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .brand-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .brand-mark {
          width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(33, 29, 25, 0.9);
          background: #211d19;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .brand-text {
          min-width: 0;
        }

        .brand-name {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.2;
          color: #1f1b17;
        }

        .brand-sub {
          margin-top: 4px;
          font-size: 12px;
          color: #857464;
          line-height: 1.3;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .main {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 56px 28px 72px;
        }

        .welcome-shell {
          width: 100%;
          max-width: 820px;
          position: relative;
        }

        .welcome-shell::before {
          content: '';
          position: absolute;
          inset: 18px -18px -18px 18px;
          background: rgba(88, 72, 56, 0.06);
          z-index: 0;
        }

        .welcome-card {
          position: relative;
          z-index: 1;
          border: 1px solid rgba(68, 57, 47, 0.12);
          background: rgba(255, 255, 255, 0.84);
          backdrop-filter: blur(16px);
          padding: 38px 34px 32px;
          box-shadow: 0 24px 60px rgba(34, 27, 21, 0.08);
        }

        .welcome-badge {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 12px;
          border: 1px solid rgba(92, 76, 61, 0.14);
          background: rgba(255, 255, 255, 0.52);
          color: #8b7968;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .welcome-title {
          margin: 22px 0 12px;
          font-size: clamp(34px, 5vw, 52px);
          line-height: 1.08;
          letter-spacing: -0.06em;
          font-weight: 700;
          color: #1d1915;
        }

        .welcome-sub {
          margin: 0 0 28px;
          font-size: 15px;
          line-height: 1.9;
          color: #67594d;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .info-box {
          padding: 18px 18px 16px;
          border: 1px solid rgba(92, 76, 61, 0.12);
          background: rgba(255, 255, 255, 0.62);
          min-height: 106px;
        }

        .info-box.full {
          grid-column: 1 / -1;
        }

        .info-label {
          margin-bottom: 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #94816f;
        }

        .info-value {
          font-size: 21px;
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1.35;
          color: #211d19;
        }

        .menu-grid {
          display: grid;
          gap: 12px;
        }

        .admin-menu-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-bottom: 12px;
        }

        .primary-btn,
        .secondary-btn,
        .outline-btn {
          width: 100%;
          min-height: 54px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }

        .primary-btn {
          background: #211d19;
          border-color: #211d19;
          color: #fff;
        }

        .secondary-btn {
          background: #4b4137;
          border-color: #4b4137;
          color: #fff;
        }

        .outline-btn {
          background: rgba(255, 255, 255, 0.76);
          border-color: rgba(84, 68, 54, 0.14);
          color: #221d18;
        }

        .primary-btn:hover,
        .secondary-btn:hover,
        .outline-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(33, 29, 25, 0.12);
        }

        .outline-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .role-notice {
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid rgba(84, 68, 54, 0.1);
        }

        .role-notice-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #7e6d5d;
          margin-bottom: 8px;
        }

        .role-notice-desc {
          font-size: 13px;
          line-height: 1.9;
          color: #796d61;
        }

        .footer {
          border-top: 1px solid rgba(74, 61, 48, 0.08);
          background: rgba(250, 247, 243, 0.62);
          backdrop-filter: blur(10px);
        }

        .footer-inner {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 18px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 12px;
          color: #8a7a6a;
        }

        @media (max-width: 700px) {
          .topbar-inner,
          .main,
          .footer-inner {
            padding-left: 16px;
            padding-right: 16px;
          }

          .topbar-inner {
            padding-top: 18px;
            padding-bottom: 18px;
          }

          .brand-mark {
            width: 40px;
            height: 40px;
            font-size: 13px;
          }

          .brand-name {
            font-size: 15px;
          }

          .welcome-shell::before {
            inset: 12px -8px -8px 12px;
          }

          .welcome-card {
            padding: 28px 18px 22px;
          }

          .welcome-title {
            font-size: 30px;
          }

          .welcome-sub {
            font-size: 14px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .info-value {
            font-size: 19px;
          }

          .admin-menu-grid {
            grid-template-columns: 1fr;
          }

          .primary-btn,
          .secondary-btn,
          .outline-btn {
            min-height: 50px;
          }
        }
      `}</style>

      <div className="page">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand-wrap">
              <div className="brand-mark">KH</div>
              <div className="brand-text">
                <div className="brand-name">Khan Apparel</div>
                <div className="brand-sub">Buyer Portal</div>
              </div>
            </div>
          </div>
        </header>

        <main className="main">
          <section className="welcome-shell">
            <div className="welcome-card">
              <div className="welcome-badge">Welcome</div>

              <h1 className="welcome-title">{profile.name}님 환영합니다</h1>
              <p className="welcome-sub">{roleDescription}</p>

              <div className="info-grid">
                <div className="info-box">
                  <div className="info-label">Role</div>
                  <div className="info-value">{roleLabel}</div>
                </div>

                <div className="info-box">
                  <div className="info-label">Username</div>
                  <div className="info-value">{profile.username}</div>
                </div>

                {profile.role === 'buyer' && (
                  <div className="info-box full">
                    <div className="info-label">Brand</div>
                    <div className="info-value">
                      {profile.requested_brand_name || '-'}
                    </div>
                  </div>
                )}
              </div>

              <div className="menu-grid">
                {profile.role === 'admin' && (
                  <div className="admin-menu-grid">
                    {/* <button className="primary-btn" onClick={handleMoveSettlement}>
                      정산표 이동
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={handleMoveMarginAnalysis}
                    >
                      마진분석 이동
                    </button> */}

                    <button className="primary-btn" onClick={handleMoveShipment}>
                      출고관리 이동
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={handleMoveAdminUsers}
                    >
                      유저 권한관리
                    </button>
                  </div>
                )}

                {profile.role !== 'admin' && (
                  <button className="primary-btn" onClick={handleMoveShipment}>
                    출고관리 이동
                  </button>
                )}

                <button
                  className="outline-btn"
                  onClick={handleLogout}
                  disabled={loading}
                >
                  {loading ? '처리 중...' : '로그아웃'}
                </button>
              </div>

              <div className="role-notice">
                <div className="role-notice-title">Access Guide</div>
                <div className="role-notice-desc">
                  {profile.role === 'admin' &&
                    '총운영자는 정산표, 마진분석, 출고관리, 유저 권한관리 페이지에 모두 접근할 수 있습니다.'}
                  {profile.role === 'manager' &&
                    '부운영자는 출고관리 페이지에 접근할 수 있으며 수정 및 삭제가 가능합니다.'}
                  {profile.role === 'buyer' &&
                    '바이어는 출고관리 페이지를 조회할 수 있습니다.'}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <div className="footer-inner">
            <span>© 2026 Khan Apparel Inc.</span>
            <span>Buyer Portal</span>
          </div>
        </footer>
      </div>
    </>
  )
}