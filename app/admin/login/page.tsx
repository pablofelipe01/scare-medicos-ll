'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      if (res.status === 401) {
        setError('Credenciales inválidas.')
        setLoading(false)
        return
      }
      if (!res.ok) {
        setError('Error al ingresar. Intenta nuevamente.')
        setLoading(false)
        return
      }
      router.push('/admin')
    } catch {
      setError('Error de conexión.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-[#EDE9FF] flex items-center justify-center mb-4">
            <ShieldCheck className="h-7 w-7 text-[#6B5CE7]" />
          </div>
          <h1 className="text-xl font-semibold text-[#1A1A2E]">Portal Administrativo</h1>
          <p className="text-sm text-[#666666] mt-1">Acceso restringido</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[#666666] mb-1 block">Usuario</label>
            <Input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError('') }}
              className="h-12 border-gray-300 focus:border-[#6B5CE7] focus:ring-[#6B5CE7]"
              disabled={loading}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-[#666666] mb-1 block">Contraseña</label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              className="h-12 border-gray-300 focus:border-[#6B5CE7] focus:ring-[#6B5CE7]"
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="w-full h-12 text-base font-semibold bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Ingresando...
              </span>
            ) : (
              'Ingresar'
            )}
          </Button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
