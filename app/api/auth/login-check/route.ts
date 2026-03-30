import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { username } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: '아이디를 입력해주세요.' },
        { status: 400 }
      )
    }

    const trimmedUsername = username.trim()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, role, status')
      .eq('username', trimmedUsername)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: '계정 확인 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    if (!profile) {
      return NextResponse.json({
        exists: false,
        status: null,
        role: null,
      })
    }

    return NextResponse.json({
      exists: true,
      status: profile.status,
      role: profile.role,
    })
  } catch (error) {
    console.error('login-check error:', error)

    return NextResponse.json(
      { error: '계정 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}