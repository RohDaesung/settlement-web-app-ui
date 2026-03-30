import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()
  const { username, password, name, requested_brand_name } = body

  if (!username || !password || !name) {
    return NextResponse.json({ error: '필수값 누락' }, { status: 400 })
  }

  // 👉 username → fake email 변환
  const email = `${username}@local.com`

  // 1. auth 생성
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user?.id

  if (!userId) {
    return NextResponse.json({ error: '유저 생성 실패' }, { status: 500 })
  }

  // 2. profiles 생성
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    username,
    name,
    requested_brand_name,
    role: 'buyer',
    status: 'pending',
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}