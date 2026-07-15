import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { setAdminSessionCookie } from '@/lib/auth'

// Comparación en tiempo constante para evitar timing attacks.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    const adminUser = process.env.ADMIN_USERNAME
    const adminPass = process.env.ADMIN_PASSWORD

    if (!adminUser || !adminPass) {
      console.error('ADMIN_USERNAME / ADMIN_PASSWORD no configurados')
      return NextResponse.json({ error: 'Portal no configurado' }, { status: 500 })
    }

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !safeEqual(username, adminUser) ||
      !safeEqual(password, adminPass)
    ) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    return setAdminSessionCookie(response, adminUser)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
