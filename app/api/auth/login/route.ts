import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    const email = `${username}@local.com`

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (signInError || !signInData.user) {
      return NextResponse.json(
        { error: signInError?.message || '로그인에 실패했습니다.' },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status, brand_id, username, name')
      .eq('id', signInData.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: '프로필 정보를 불러올 수 없습니다.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      role: profile.role,
      status: profile.status,
      brand_id: profile.brand_id,
      username: profile.username,
      name: profile.name,
    })
  } catch (error) {
    console.error('login route error:', error)
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}