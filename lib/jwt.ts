import jwt from 'jsonwebtoken'

export function verifyScareJWT(token: string): boolean {
  try {
    jwt.verify(token, process.env.SCARE_JWT_SECRET!, {
      algorithms: ['HS256'],
    })
    return true
  } catch {
    return false
  }
}

// ── Session JWT ──

export function signSessionJWT(cedula: string): string {
  return jwt.sign({ cedula }, process.env.SESSION_JWT_SECRET!, {
    algorithm: 'HS256',
    expiresIn: '24h',
  })
}

export function verifySessionJWT(token: string): { cedula: string } | null {
  try {
    const payload = jwt.verify(token, process.env.SESSION_JWT_SECRET!, {
      algorithms: ['HS256'],
    }) as { cedula: string }
    return { cedula: payload.cedula }
  } catch {
    return null
  }
}
