'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [cedula, setCedula] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cedula.trim()) return

    setLoading(true)
    setError('')
    setStatusMessage('Verificando...')

    try {
      const res = await fetch(`/api/user/${cedula.trim()}`)

      if (res.status === 404) {
        setError('Cedula no encontrada. Contacta a SCARE.')
        setLoading(false)
        setStatusMessage('')
        return
      }

      if (!res.ok) {
        setError('Error al verificar. Intenta nuevamente.')
        setLoading(false)
        setStatusMessage('')
        return
      }

      const data = await res.json()

      if (!data.usuario.wallet_creada) {
        setStatusMessage('Preparando tu billetera en Polygon...')
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }

      sessionStorage.setItem('cedula_activa', cedula.trim())
      router.push('/dashboard')
    } catch {
      setError('Error de conexion. Intenta nuevamente.')
      setLoading(false)
      setStatusMessage('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-sm p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A2E]">
            Sylicon<span className="text-[#6B5CE7]">.</span>
          </h1>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">
            Ingresa tu numero de cedula
          </h2>
          <p className="text-sm text-[#666666]">
            Accede a tu billetera de aportes on-chain
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Numero de cedula"
            value={cedula}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              setCedula(val)
              setError('')
            }}
            className="h-12 text-lg text-center border-gray-300 focus:border-[#6B5CE7] focus:ring-[#6B5CE7]"
            disabled={loading}
          />

          <Button
            type="submit"
            disabled={loading || !cedula.trim()}
            className="w-full h-12 text-base font-semibold bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {statusMessage}
              </span>
            ) : (
              'Ingresar'
            )}
          </Button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
