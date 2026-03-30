'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type RoleType = 'admin' | 'manager' | 'buyer'

type GuardMode = 'admin-manager-only' | 'admin-only' | 'authenticated-only'

type AuthPageGuardProps = {
  mode: GuardMode
  children: React.ReactNode
  redirectBuyerTo?: string
  redirectAdminManagerTo?: string
}

export default function AuthPageGuard({
  mode,
  children,
  redirectBuyerTo = '/shipment-management',
  redirectAdminManagerTo = '/dashboard',
}: AuthPageGuardProps) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser()

        if (!authData.user) {
          router.replace('/')
          return
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', authData.user.id)
          .single()

        if (error || !profile) {
          await supabase.auth.signOut()
          router.replace('/')
          return
        }

        if (profile.status !== 'approved') {
          await supabase.auth.signOut()
          router.replace('/')
          return
        }

        const role = profile.role as RoleType

        if (mode === 'authenticated-only') {
          setAllowed(true)
          return
        }

        if (mode === 'admin-only') {
          if (role !== 'admin') {
            if (role === 'buyer') {
              router.replace(redirectBuyerTo)
              return
            }

            router.replace(redirectAdminManagerTo)
            return
          }

          setAllowed(true)
          return
        }

        if (mode === 'admin-manager-only') {
          if (role !== 'admin' && role !== 'manager') {
            router.replace(redirectBuyerTo)
            return
          }

          setAllowed(true)
          return
        }
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [mode, redirectBuyerTo, redirectAdminManagerTo, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f1ea]">
        <div className="border border-[#d7cec1] bg-white px-6 py-4 text-sm text-[#6c6257]">
          불러오는 중...
        </div>
      </div>
    )
  }

  if (!allowed) return null

  return <>{children}</>
}