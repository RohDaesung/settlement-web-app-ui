'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type User = {
  id: string
  username: string
  name: string
  requested_brand_name: string
  status: 'pending' | 'approved'
  role: 'admin' | 'manager' | 'buyer'
  brand_id: string | null
}

type Brand = {
  id: string
  name: string
}

type SaveStateMap = Record<string, boolean>

export default function AdminUsersPage() {
  const router = useRouter()

  const [authorized, setAuthorized] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const [users, setUsers] = useState<User[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [pageLoading, setPageLoading] = useState(true)

  const [savingRole, setSavingRole] = useState<SaveStateMap>({})
  const [savingBrand, setSavingBrand] = useState<SaveStateMap>({})
  const [approving, setApproving] = useState<SaveStateMap>({})

  const checkAccess = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError || !authData.user) {
        alert('로그인이 필요합니다.')
        router.push('/')
        return false
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        alert('권한 정보를 불러올 수 없습니다.')
        router.push('/')
        return false
      }

      if (profile.status !== 'approved') {
        await supabase.auth.signOut()
        alert('승인되지 않은 계정입니다.')
        router.push('/')
        return false
      }

      if (profile.role !== 'admin') {
        alert('운영자만 접근할 수 있습니다.')
        router.push('/')
        return false
      }

      setAuthorized(true)
      return true
    } catch (error) {
      console.error('checkAccess error:', error)
      alert('권한 확인 중 오류가 발생했습니다.')
      router.push('/')
      return false
    } finally {
      setAuthLoading(false)
    }
  }

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, name, requested_brand_name, status, role, brand_id')
      .order('status', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('fetchUsers error:', error)
      alert('유저 목록을 불러오지 못했습니다.')
      return
    }

    setUsers((data || []) as User[])
  }

  const fetchBrands = async () => {
    const { data, error } = await supabase
      .from('brands')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      console.error('fetchBrands error:', error)
      alert('브랜드 목록을 불러오지 못했습니다.')
      return
    }

    setBrands((data || []) as Brand[])
  }

  const refreshAll = async () => {
    setPageLoading(true)
    await Promise.all([fetchUsers(), fetchBrands()])
    setPageLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const ok = await checkAccess()
      if (!ok) return
      await refreshAll()
    }

    init()
  }, [])

  const brandMap = useMemo(() => {
    return brands.reduce<Record<string, string>>((acc, brand) => {
      acc[brand.id] = brand.name
      return acc
    }, {})
  }, [brands])

  const approveUser = async (user: User) => {
    const isBuyer = user.role === 'buyer'

    if (isBuyer && !user.brand_id) {
      alert('buyer는 브랜드를 선택해야 승인할 수 있습니다.')
      return
    }

    setApproving((prev) => ({ ...prev, [user.id]: true }))

    try {
      const updatePayload =
        user.role === 'buyer'
          ? { status: 'approved' }
          : { status: 'approved', brand_id: null }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id)

      if (error) {
        console.error('approveUser error:', error)
        alert('승인 처리 중 오류가 발생했습니다.')
        return
      }

      await fetchUsers()
    } finally {
      setApproving((prev) => ({ ...prev, [user.id]: false }))
    }
  }

  const updateRole = async (id: string, role: User['role']) => {
    setSavingRole((prev) => ({ ...prev, [id]: true }))

    try {
      const payload =
        role === 'buyer'
          ? { role }
          : {
              role,
              brand_id: null,
            }

      const { error } = await supabase.from('profiles').update(payload).eq('id', id)

      if (error) {
        console.error('updateRole error:', error)
        alert('권한 변경 중 오류가 발생했습니다.')
        return
      }

      await fetchUsers()
    } finally {
      setSavingRole((prev) => ({ ...prev, [id]: false }))
    }
  }

  const updateBrand = async (id: string, brand_id: string) => {
    setSavingBrand((prev) => ({ ...prev, [id]: true }))

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ brand_id: brand_id || null })
        .eq('id', id)

      if (error) {
        console.error('updateBrand error:', error)
        alert('브랜드 변경 중 오류가 발생했습니다.')
        return
      }

      await fetchUsers()
    } finally {
      setSavingBrand((prev) => ({ ...prev, [id]: false }))
    }
  }

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-[#f5f1ea] flex items-center justify-center">
        <div className="border border-[#d7cec1] bg-white px-6 py-4 text-sm text-[#6c6257]">
          불러오는 중...
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea] text-[#2f2a24]">
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
        <div className="mb-6 border border-[#d7cec1] bg-[linear-gradient(180deg,#fbf8f3_0%,#f5efe6_100%)] shadow-sm">
          <div className="px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#9b8f80]">
                  Admin Users
                </p>
                <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[#2f2a24]">
                  유저 관리
                </h1>
                <p className="mt-2 text-sm text-[#7b7266]">
                  계정 승인, 권한 변경, 브랜드 연결을 관리합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/')}
                className="inline-flex h-11 items-center justify-center border border-[#d7cec1] bg-white px-4 text-sm font-medium text-[#3c342c] transition hover:bg-[#f7f2eb]"
              >
                홈으로 이동
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border border-[#d7cec1] bg-white shadow-[0_12px_35px_rgba(89,71,48,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse">
              <thead>
                <tr className="bg-[#efe7dc]">
                  <th className="border-b border-r border-[#d7cec1] px-4 py-4 text-left text-sm font-semibold">
                    이름
                  </th>
                  <th className="border-b border-r border-[#d7cec1] px-4 py-4 text-left text-sm font-semibold">
                    아이디
                  </th>
                  <th className="border-b border-r border-[#d7cec1] px-4 py-4 text-left text-sm font-semibold">
                    요청 브랜드
                  </th>
                  <th className="border-b border-r border-[#d7cec1] px-4 py-4 text-left text-sm font-semibold">
                    상태
                  </th>
                  <th className="border-b border-r border-[#d7cec1] px-4 py-4 text-left text-sm font-semibold">
                    권한
                  </th>
                  <th className="border-b border-r border-[#d7cec1] px-4 py-4 text-left text-sm font-semibold">
                    브랜드
                  </th>
                  <th className="border-b border-[#d7cec1] px-4 py-4 text-left text-sm font-semibold">
                    액션
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map((user, index) => {
                  const isBuyer = user.role === 'buyer'
                  const isApproved = user.status === 'approved'

                  return (
                    <tr
                      key={user.id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-[#fcfaf7]'}
                    >
                      <td className="border-b border-r border-[#e3dbcf] px-4 py-4 text-sm">
                        {user.name || '-'}
                      </td>

                      <td className="border-b border-r border-[#e3dbcf] px-4 py-4 text-sm">
                        {user.username}
                      </td>

                      <td className="border-b border-r border-[#e3dbcf] px-4 py-4 text-sm text-[#6d6459]">
                        {user.requested_brand_name || '-'}
                      </td>

                      <td className="border-b border-r border-[#e3dbcf] px-4 py-4 text-sm">
                        <span
                          className={`inline-flex min-h-[32px] items-center px-3 text-xs font-semibold ${
                            isApproved
                              ? 'border border-[#cfe0d4] bg-[#eef7f0] text-[#3e6b4f]'
                              : 'border border-[#ead9c8] bg-[#fcf5ed] text-[#9a6b3d]'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>

                      <td className="border-b border-r border-[#e3dbcf] px-4 py-4">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            updateRole(user.id, e.target.value as User['role'])
                          }
                          disabled={!!savingRole[user.id]}
                          className="h-10 min-w-[140px] border border-[#d7cec1] bg-white px-3 text-sm outline-none"
                        >
                          <option value="buyer">buyer</option>
                          <option value="manager">manager</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>

                      <td className="border-b border-r border-[#e3dbcf] px-4 py-4">
                        {isBuyer && (
                          <select
                            value={user.brand_id || ''}
                            onChange={(e) => updateBrand(user.id, e.target.value)}
                            disabled={!!savingBrand[user.id]}
                            className="h-10 min-w-[180px] border border-[#d7cec1] bg-white px-3 text-sm outline-none"
                          >
                            <option value="">선택</option>
                            {brands.map((brand) => (
                              <option key={brand.id} value={brand.id}>
                                {brand.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="border-b border-[#e3dbcf] px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {user.status === 'pending' ? (
                            <button
                              onClick={() => approveUser(user)}
                              disabled={!!approving[user.id]}
                              className="inline-flex h-10 items-center justify-center border border-[#3c342c] bg-[#3c342c] px-4 text-sm font-medium text-white transition hover:bg-[#2f2922] disabled:opacity-50"
                            >
                              {approving[user.id] ? '처리 중...' : '승인'}
                            </button>
                          ) : (
                            <div className="inline-flex h-10 items-center justify-center border border-[#d7cec1] bg-[#faf7f2] px-4 text-sm text-[#7b7266]">
                              승인완료
                            </div>
                          )}

                          {isBuyer && (
                            <div className="inline-flex h-10 items-center justify-center border border-[#e5ddd0] bg-[#f8f5f0] px-4 text-xs text-[#8a8074]">
                              {user.brand_id
                                ? brandMap[user.brand_id] || '브랜드 연결됨'
                                : '브랜드 필요'}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-16 text-center text-sm text-[#9e9487]"
                    >
                      유저가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 border border-[#ddd3c5] bg-white px-4 py-4 text-sm text-[#6f655a]">
          <div className="font-semibold text-[#4f473e] mb-2">운영 기준</div>
          <div className="space-y-1">
            <div>- admin: 브랜드 선택 불필요</div>
            <div>- manager: 브랜드 선택 불필요</div>
            <div>- buyer: 브랜드 선택 필요</div>
            <div>- buyer는 브랜드가 선택되어야 승인 가능</div>
          </div>
        </div>
      </div>
    </div>
  )
}