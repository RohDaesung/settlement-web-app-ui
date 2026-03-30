'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'

type UsernameCheckState = 'idle' | 'checking' | 'available' | 'unavailable'
type ModalTone = 'success' | 'error' | 'info'

type ModalState = {
  open: boolean
  tone: ModalTone
  title: string
  description: string
  redirectTo?: string | null
}

const INITIAL_MODAL_STATE: ModalState = {
  open: false,
  tone: 'info',
  title: '',
  description: '',
  redirectTo: null,
}

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [requestedBrandName, setRequestedBrandName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [usernameCheckState, setUsernameCheckState] =
    useState<UsernameCheckState>('idle')
  const [usernameCheckMessage, setUsernameCheckMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [modal, setModal] = useState<ModalState>(INITIAL_MODAL_STATE)

  const trimmedUsername = username.trim()
  const trimmedName = name.trim()
  const trimmedBrandName = requestedBrandName.trim()

  const isUsernameFormatValid = useMemo(() => {
    return /^[a-zA-Z0-9._-]{4,20}$/.test(trimmedUsername)
  }, [trimmedUsername])

  const isPasswordValid = useMemo(() => {
    return password.length >= 6
  }, [password])

  const isPasswordMatched = useMemo(() => {
    if (!passwordConfirm) return false
    return password === passwordConfirm
  }, [password, passwordConfirm])

  const canSubmit =
    trimmedUsername.length > 0 &&
    trimmedName.length > 0 &&
    trimmedBrandName.length > 0 &&
    isUsernameFormatValid &&
    usernameCheckState === 'available' &&
    isPasswordValid &&
    isPasswordMatched &&
    !submitting

  const openModal = (
    tone: ModalTone,
    title: string,
    description: string,
    redirectTo?: string | null
  ) => {
    setModal({
      open: true,
      tone,
      title,
      description,
      redirectTo: redirectTo ?? null,
    })
  }

  const closeModal = () => {
    const redirectTo = modal.redirectTo
    setModal(INITIAL_MODAL_STATE)

    if (redirectTo) {
      window.location.href = redirectTo
    }
  }

  useEffect(() => {
    if (!modal.open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [modal.open, modal.redirectTo])

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setUsernameCheckState('idle')
    setUsernameCheckMessage('')
  }

  const handleCheckUsername = async () => {
    if (!trimmedUsername) {
      setUsernameCheckState('unavailable')
      setUsernameCheckMessage('아이디를 먼저 입력해주세요.')
      return
    }

    if (!isUsernameFormatValid) {
      setUsernameCheckState('unavailable')
      setUsernameCheckMessage(
        '아이디는 4~20자의 영문, 숫자, . _ - 만 사용할 수 있습니다.'
      )
      return
    }

    try {
      setUsernameCheckState('checking')
      setUsernameCheckMessage('아이디를 확인하는 중입니다...')

      const res = await fetch('/api/auth/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: trimmedUsername }),
      })

      const data = await res.json()

      if (!res.ok) {
        setUsernameCheckState('unavailable')
        setUsernameCheckMessage(data?.error || '중복 확인에 실패했습니다.')
        return
      }

      if (data?.available) {
        setUsernameCheckState('available')
        setUsernameCheckMessage('사용 가능한 아이디입니다.')
      } else {
        setUsernameCheckState('unavailable')
        setUsernameCheckMessage('이미 사용 중인 아이디입니다.')
      }
    } catch (error) {
      console.error('username check error:', error)
      setUsernameCheckState('unavailable')
      setUsernameCheckMessage('중복 확인 중 오류가 발생했습니다.')
    }
  }

  const handleSignup = async () => {
    if (!trimmedUsername || !trimmedName || !trimmedBrandName) {
      openModal('error', '입력 확인', '필수 항목을 모두 입력해주세요.')
      return
    }

    if (!isUsernameFormatValid) {
      openModal('error', '아이디 형식 오류', '아이디 형식을 확인해주세요.')
      return
    }

    if (usernameCheckState !== 'available') {
      openModal(
        'error',
        '아이디 확인 필요',
        '아이디 중복확인을 먼저 완료해주세요.'
      )
      return
    }

    if (!isPasswordValid) {
      openModal(
        'error',
        '비밀번호 형식 오류',
        '비밀번호는 최소 6자 이상이어야 합니다.'
      )
      return
    }

    if (password !== passwordConfirm) {
      openModal('error', '비밀번호 불일치', '비밀번호가 다릅니다.')
      return
    }

    try {
      setSubmitting(true)

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password,
          name: trimmedName,
          requested_brand_name: trimmedBrandName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        openModal(
          'error',
          '회원가입 실패',
          data?.error || '회원가입에 실패했습니다.'
        )
        return
      }

      openModal(
        'success',
        '가입이 완료되었습니다',
        '현재 계정은 승인 대기 상태입니다.\n관리자 승인 후 로그인할 수 있습니다.',
        '/'
      )
    } catch (error) {
      console.error('signup error:', error)
      openModal(
        'error',
        '오류가 발생했습니다',
        '회원가입 중 오류가 발생했습니다.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    await handleSignup()
  }

  const modalAccentClass =
    modal.tone === 'success'
      ? 'border-[#d6dfd6] bg-[linear-gradient(180deg,#f8fbf7_0%,#f2f7f1_100%)] text-[#2e5a3a]'
      : modal.tone === 'error'
        ? 'border-[#ead7d2] bg-[linear-gradient(180deg,#fff8f6_0%,#fbf1ee_100%)] text-[#9e4d42]'
        : 'border-[#e5dccf] bg-[linear-gradient(180deg,#faf8f4_0%,#f4efe8_100%)] text-[#6a5d50]'

  return (
    <>
      <div className="min-h-screen bg-[#f5f1ea] text-[#2f2a24]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col lg:grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-[#ddd2c3] bg-[linear-gradient(180deg,#f8f4ed_0%,#efe6da_100%)] px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-16">
            <div className="max-w-[520px]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#9b8f80]">
                Khan Apparel System
              </p>
              <h1 className="mt-4 text-[34px] font-semibold tracking-[-0.04em] text-[#2f2a24] sm:text-[42px]">
                내부 운영 시스템
                <br />
                회원가입
              </h1>
              <p className="mt-5 text-sm leading-7 text-[#6e655a] sm:text-base">
                가입 후 바로 사용되는 구조가 아니라,
                <br />
                관리자 승인 후 이용 가능한 내부 시스템입니다.
                <br />
                브랜드명과 사용자 정보를 정확히 입력해주세요.
              </p>

              <div className="mt-10 space-y-4">
                <div className="border border-[#d9cfbf] bg-white px-4 py-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 text-[#6f6255]" />
                    <div>
                      <p className="text-sm font-semibold text-[#2f2a24]">
                        가입 후 승인 대기
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#6e655a]">
                        회원가입 직후에는 바로 로그인되지 않으며,
                        관리자 승인 후 이용 가능합니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-[#d9cfbf] bg-white px-4 py-4">
                  <div className="flex items-start gap-3">
                    <User className="mt-0.5 h-5 w-5 text-[#6f6255]" />
                    <div>
                      <p className="text-sm font-semibold text-[#2f2a24]">
                        아이디 작성 규칙
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#6e655a]">
                        4~20자의 영문, 숫자, 점(.), 밑줄(_), 하이픈(-)만
                        사용할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-[#d9cfbf] bg-white px-4 py-4">
                  <div className="flex items-start gap-3">
                    <Lock className="mt-0.5 h-5 w-5 text-[#6f6255]" />
                    <div>
                      <p className="text-sm font-semibold text-[#2f2a24]">
                        비밀번호 안내
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#6e655a]">
                        비밀번호는 최소 6자 이상 입력해주세요.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 text-sm text-[#6e655a]">
                이미 계정이 있으신가요?{' '}
                <Link href="/" className="font-semibold text-[#2f2a24] underline">
                  로그인으로 이동
                </Link>
              </div>
            </div>
          </div>

          <div className="px-6 py-10 sm:px-10 lg:px-14 lg:py-16">
            <div className="mx-auto w-full max-w-[520px]">
              <div className="border border-[#ddd2c3] bg-white shadow-[0_14px_40px_rgba(64,46,28,0.05)]">
                <div className="border-b border-[#eee4d7] px-6 py-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#2f2a24]">
                    가입 정보 입력
                  </h2>
                  <p className="mt-1 text-sm text-[#7c7367]">
                    아래 정보를 입력한 뒤 가입을 진행해주세요.
                  </p>
                </div>

                <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                      아이디
                    </label>
                    <div className="flex gap-2">
                      <input
                        placeholder="아이디를 입력하세요"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className="h-12 flex-1 border border-[#d7cec1] bg-white px-4 text-sm outline-none placeholder:text-[#a09588]"
                      />
                      <button
                        type="button"
                        onClick={handleCheckUsername}
                        disabled={usernameCheckState === 'checking'}
                        className="inline-flex h-12 shrink-0 items-center justify-center border border-[#3c342c] bg-[#3c342c] px-4 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {usernameCheckState === 'checking' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          '중복확인'
                        )}
                      </button>
                    </div>

                    <div className="mt-2 min-h-[24px]">
                      {usernameCheckState === 'available' && (
                        <div className="flex items-center gap-2 text-sm text-[#2f6b46]">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{usernameCheckMessage}</span>
                        </div>
                      )}

                      {usernameCheckState === 'unavailable' && (
                        <div className="flex items-center gap-2 text-sm text-[#b14f42]">
                          <AlertCircle className="h-4 w-4" />
                          <span>{usernameCheckMessage}</span>
                        </div>
                      )}

                      {usernameCheckState === 'checking' && (
                        <div className="flex items-center gap-2 text-sm text-[#7b7266]">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{usernameCheckMessage}</span>
                        </div>
                      )}

                      {usernameCheckState === 'idle' && trimmedUsername.length > 0 && (
                        <p className="text-sm text-[#7b7266]">
                          4~20자의 영문, 숫자, . _ - 사용 가능
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                      이름
                    </label>
                    <input
                      placeholder="이름을 입력하세요"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 w-full border border-[#d7cec1] bg-white px-4 text-sm outline-none placeholder:text-[#a09588]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                      브랜드명
                    </label>
                    <input
                      placeholder="소속 또는 요청 브랜드명을 입력하세요"
                      value={requestedBrandName}
                      onChange={(e) => setRequestedBrandName(e.target.value)}
                      className="h-12 w-full border border-[#d7cec1] bg-white px-4 text-sm outline-none placeholder:text-[#a09588]"
                    />
                    <p className="mt-2 text-sm text-[#7b7266]">
                      가입 승인 시 브랜드 연결 기준으로 사용됩니다.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                      비밀번호
                    </label>
                    <input
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full border border-[#d7cec1] bg-white px-4 text-sm outline-none placeholder:text-[#a09588]"
                    />
                    <div className="mt-2 min-h-[24px]">
                      {password.length > 0 && (
                        <p
                          className={`text-sm ${
                            isPasswordValid ? 'text-[#2f6b46]' : 'text-[#b14f42]'
                          }`}
                        >
                          {isPasswordValid
                            ? '사용 가능한 비밀번호 형식입니다.'
                            : '비밀번호는 최소 6자 이상이어야 합니다.'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4a433b]">
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      placeholder="비밀번호를 다시 입력하세요"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      className="h-12 w-full border border-[#d7cec1] bg-white px-4 text-sm outline-none placeholder:text-[#a09588]"
                    />
                    <div className="mt-2 min-h-[24px]">
                      {passwordConfirm.length > 0 && (
                        <div
                          className={`flex items-center gap-2 text-sm ${
                            isPasswordMatched ? 'text-[#2f6b46]' : 'text-[#b14f42]'
                          }`}
                        >
                          {isPasswordMatched ? (
                            <BadgeCheck className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                          <span>
                            {isPasswordMatched
                              ? '비밀번호가 일치합니다.'
                              : '비밀번호가 일치하지 않습니다.'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border border-[#e8ddd0] bg-[#faf7f2] px-4 py-4 text-sm leading-6 text-[#6e655a]">
                    가입 후 관리자가 확인한 뒤 승인 처리합니다.
                    <br />
                    승인 전에는 로그인 및 시스템 이용이 제한됩니다.
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 border border-[#3c342c] bg-[#3c342c] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        가입 처리중...
                      </>
                    ) : (
                      '가입하기'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(26,22,18,0.45)] px-4 backdrop-blur-[3px]"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-[460px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute left-4 top-4 right-[-14px] bottom-[-14px] bg-[rgba(79,64,48,0.10)]" />

            <div className="relative border border-[#ddd2c3] bg-white shadow-[0_24px_70px_rgba(32,24,18,0.18)]">
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center border border-[#e7ddd1] bg-white text-[#6d6156] transition hover:bg-[#f7f3ed]"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>

              <div className={`border-b px-6 py-5 ${modalAccentClass}`}>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center border border-current/15 bg-white/70">
                    {modal.tone === 'success' && <BadgeCheck className="h-5 w-5" />}
                    {modal.tone === 'error' && <AlertCircle className="h-5 w-5" />}
                    {modal.tone === 'info' && <ShieldCheck className="h-5 w-5" />}
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] opacity-70">
                      System Notice
                    </p>
                    <h3 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[#2f2a24]">
                      {modal.title}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6">
                <p className="whitespace-pre-line text-sm leading-7 text-[#6f6458]">
                  {modal.description}
                </p>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="inline-flex h-11 min-w-[110px] items-center justify-center border border-[#3c342c] bg-[#3c342c] px-5 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}