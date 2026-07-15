import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromRequest, unauthorizedResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return unauthorizedResponse()
  return NextResponse.json({ username: session.username })
}
