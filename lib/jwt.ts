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
