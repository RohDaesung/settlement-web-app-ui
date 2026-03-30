export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
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

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, role, status')
      .eq('username', trimmedUsername)
      .limit(1)

    if (error) {
      return NextResponse.json(
        {
          error: '계정 확인 실패',
          debug: {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          },
        },
        { status: 500 }
      )
    }

    const profile = data?.[0]

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
    return NextResponse.json(
      {
        error: '계정 확인 실패',
        debug:
          error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : String(error),
      },
      { status: 500 }
    )
  }
}