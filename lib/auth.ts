import { NextRequest, NextResponse } from 'next/server'
import { signSessionJWT, verifySessionJWT, signAdminJWT, verifyAdminJWT } from './jwt'

const COOKIE_NAME = 'session_token'
const MAX_AGE = 60 * 60 * 24 // 24 hours

const ADMIN_COOKIE_NAME = 'admin_session'
const ADMIN_MAX_AGE = 60 * 60 * 8 // 8 hours

export function setSessionCookie(response: NextResponse, cedula: string): NextResponse {
  response.cookies.set(COOKIE_NAME, signSessionJWT(cedula), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
  return response
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

export function getSessionFromRequest(request: NextRequest): { cedula: string } | null {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionJWT(token)
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
}

// ── Sesión de administrador (cookie separada de la de afiliados) ──

export function setAdminSessionCookie(response: NextResponse, username: string): NextResponse {
  response.cookies.set(ADMIN_COOKIE_NAME, signAdminJWT(username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_MAX_AGE,
  })
  return response
}

export function clearAdminSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}

export function getAdminSessionFromRequest(request: NextRequest): { username: string } | null {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  if (!token) return null
  return verifyAdminJWT(token)
}
