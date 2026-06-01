// app/api/slack/channels/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { listChannels } from '@/lib/slack'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const email = await requireAuth(req)
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const channels = await listChannels() // トークン無しなら [] が返る
    return NextResponse.json(channels)
  } catch (e) {
    console.error('listChannels failed', e)
    // 取得失敗でもUIは「チャンネル無し」で degrade（作成は可能にする）
    return NextResponse.json([], { status: 200 })
  }
}
