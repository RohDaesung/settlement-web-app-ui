import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const { username } = await req.json()

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  return NextResponse.json({
    available: !data,
  })
}