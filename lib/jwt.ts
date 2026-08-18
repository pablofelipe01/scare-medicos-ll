import jwt from 'jsonwebtoken'

export function verifyScareJWT(token: string): boolean {
  return verifyScareJWTDetallado(token).valido
}

// Igual que verifyScareJWT, pero devuelve el motivo del rechazo para poder
// registrarlo en webhook_logs. Nunca expone el token ni el secreto.
export function verifyScareJWTDetallado(
  token: string
): { valido: true } | { valido: false; motivo: string } {
  try {
    jwt.verify(token, process.env.SCARE_JWT_SECRET!, {
      algorithms: ['HS256'],
    })
    return { valido: true }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valido: false, motivo: `Token expirado el ${error.expiredAt.toISOString()}` }
    }
    if (error instanceof jwt.JsonWebTokenError) {
      // Cubre firma inválida, algoritmo distinto a HS256 y token malformado
      return { valido: false, motivo: `Token inválido: ${error.message}` }
    }
    return { valido: false, motivo: 'Error desconocido al verificar el token' }
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

// ── Admin session JWT ──

export function signAdminJWT(username: string): string {
  return jwt.sign({ username, role: 'admin' }, process.env.SESSION_JWT_SECRET!, {
    algorithm: 'HS256',
    expiresIn: '8h',
  })
}

export function verifyAdminJWT(token: string): { username: string } | null {
  try {
    const payload = jwt.verify(token, process.env.SESSION_JWT_SECRET!, {
      algorithms: ['HS256'],
    }) as { username: string; role?: string }
    if (payload.role !== 'admin') return null
    return { username: payload.username }
  } catch {
    return null
  }
}
