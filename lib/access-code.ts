import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { WORDLIST_ES } from './wordlist-es'

// Caracteres sin ambiguedad (sin 0/O, 1/l/I)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

export function generateAccessCode(): string {
  let code: string
  do {
    code = Array.from(crypto.randomBytes(8))
      .map((b) => CHARS[b % CHARS.length])
      .join('')
  } while (!/[A-Z]/.test(code) || !/[0-9]/.test(code))
  return code
}

export function generateRecoveryPhrase(): string {
  const words: string[] = []
  for (let i = 0; i < 5; i++) {
    const idx = crypto.randomInt(WORDLIST_ES.length)
    words.push(WORDLIST_ES[idx])
  }
  return words.join(' ')
}

export async function hashValue(value: string): Promise<string> {
  return bcrypt.hash(value, 10)
}

export async function verifyValue(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash)
}
