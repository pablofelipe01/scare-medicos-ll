'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

type Step = 'CEDULA' | 'LOGIN' | 'SETUP_PIN' | 'SHOW_PHRASE' | 'FORGOT_PIN' | 'RESET_PIN'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('CEDULA')
  const [cedula, setCedula] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [fraseGenerada, setFraseGenerada] = useState('')
  const [nuevoPin, setNuevoPin] = useState('')
  const [correoMasked, setCorreoMasked] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  // Paso 1: verificar cedula
  const handleCheckCedula = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cedula.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/user/${cedula.trim()}`)

      if (res.status === 404) {
        setError('Cédula no encontrada. Contacta a ARGESSA.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError('Error al verificar. Intenta nuevamente.')
        setLoading(false)
        return
      }

      const data = await res.json()

      if (data.usuario.codigo_configurado) {
        setStep('LOGIN')
      } else {
        setStep('SETUP_PIN')
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // Paso 2a: login con PIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificacion: cedula.trim(), pin: pin.trim() }),
      })

      if (res.status === 401) {
        setError('PIN incorrecto.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError('Error al verificar. Intenta nuevamente.')
        setLoading(false)
        return
      }

      const data = await res.json()

      if (data.provisional) {
        // PIN provisional válido — pedir nuevo PIN permanente
        setPin('')
        setNuevoPin('')
        setPinConfirm('')
        setStep('RESET_PIN')
        setLoading(false)
        return
      }

      sessionStorage.setItem('cedula_activa', cedula.trim())
      router.push('/dashboard')
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
      setLoading(false)
    }
  }

  // Paso 2b: crear PIN (nuevo usuario)
  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (pin.length !== 6) {
      setError('El PIN debe ser de 6 dígitos.')
      return
    }

    if (pin !== pinConfirm) {
      setError('Los PIN no coinciden.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificacion: cedula.trim(), pin }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al configurar. Intenta nuevamente.')
        setLoading(false)
        return
      }

      const data = await res.json()
      setFraseGenerada(data.fraseRecuperacion)
      setStep('SHOW_PHRASE')
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // Paso: Enviar PIN provisional por correo
  const handleForgotPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cedula.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificacion: cedula.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al enviar correo.')
        setLoading(false)
        return
      }

      setCorreoMasked(data.correo)
      setStep('LOGIN')
      setError('')
      setSuccess(`PIN provisional enviado a ${data.correo}. Válido por 15 minutos.`)
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // Paso: Crear nuevo PIN después de usar provisional
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (nuevoPin.length !== 6) {
      setError('El PIN debe ser de 6 dígitos.')
      return
    }

    if (nuevoPin !== pinConfirm) {
      setError('Los PIN no coinciden.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identificacion: cedula.trim(),
          nuevoPin,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al cambiar PIN.')
        setLoading(false)
        return
      }

      sessionStorage.setItem('cedula_activa', cedula.trim())
      router.push('/dashboard')
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('CEDULA')
    setPin('')
    setPinConfirm('')
    setNuevoPin('')
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-sm p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/Negativo.png" alt="TokBox" className="h-10" />
        </div>

        {/* PASO 1: Cedula */}
        {step === 'CEDULA' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">
                Ingresa tu número de cédula
              </h2>
              <p className="text-sm text-[#666666]">
                Accede a tu TokBox
              </p>
            </div>
            <form onSubmit={handleCheckCedula} className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Número de cédula"
                value={cedula}
                onChange={(e) => {
                  setCedula(e.target.value.replace(/\D/g, ''))
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
                    Verificando...
                  </span>
                ) : (
                  'Continuar'
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                onClick={() => { setStep('LOGIN'); setError('') }}
                className="text-sm text-[#6B5CE7] hover:underline"
              >
                Ya tengo mi PIN
              </button>
            </div>
          </>
        )}

        {/* PASO 2a: Login con cedula + PIN */}
        {step === 'LOGIN' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">
                Ingresa a tu cuenta
              </h2>
              <p className="text-sm text-[#666666]">
                Cédula y PIN de 6 dígitos
              </p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Número de cédula"
                value={cedula}
                onChange={(e) => {
                  setCedula(e.target.value.replace(/\D/g, ''))
                  setError('')
                }}
                className="h-12 text-lg text-center border-gray-300 focus:border-[#6B5CE7] focus:ring-[#6B5CE7]"
                disabled={loading}
              />
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="6 números"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setError('')
                  setSuccess('')
                }}
                className="h-12 text-2xl text-center tracking-[0.5em] border-gray-300 focus:border-[#6B5CE7] focus:ring-[#6B5CE7]"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !cedula.trim() || pin.length !== 6}
                className="w-full h-12 text-base font-semibold bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando...
                  </span>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>
            <div className="mt-4 flex justify-between">
              <button onClick={handleBack} className="text-sm text-[#666666] hover:text-[#1A1A2E]">
                Primera vez
              </button>
              <button
                onClick={() => { setStep('FORGOT_PIN'); setPin(''); setError(''); setSuccess('') }}
                className="text-sm text-[#6B5CE7] hover:underline"
              >
                Olvidé mi PIN
              </button>
            </div>
          </>
        )}

        {/* PASO 2b: Crear PIN (nuevo usuario) */}
        {step === 'SETUP_PIN' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">
                Crea tu PIN de acceso
              </h2>
              <p className="text-sm text-[#666666]">
                Elige un PIN de 6 dígitos para ingresar a tu cuenta
              </p>
            </div>
            <form onSubmit={handleSetupPin} className="space-y-4">
              <div>
                <label className="text-xs text-[#666666] mb-1 block">PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6 números"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setError('')
                  }}
                  className="h-12 text-2xl text-center tracking-[0.5em] border-gray-300 focus:border-[#6B5CE7] focus:ring-[#6B5CE7]"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-[#666666] mb-1 block">Confirmar PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Repetir 6 digitos"
                  value={pinConfirm}
                  onChange={(e) => {
                    setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setError('')
                  }}
                  className="h-12 text-2xl text-center tracking-[0.5em] border-gray-300 focus:border-[#6B5CE7] focus:ring-[#6B5CE7]"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                disabled={loading || pin.length !== 6 || pinConfirm.length !== 6}
                className="w-full h-12 text-base font-semibold bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Configurando...
                  </span>
                ) : (
                  'Crear PIN'
                )}
              </Button>
            </form>
            <div className="mt-4">
              <button onClick={handleBack} className="text-sm text-[#666666] hover:text-[#1A1A2E]">
                Cambiar cédula
              </button>
            </div>
          </>
        )}

        {/* PASO: Mostrar frase de recuperación */}
        {step === 'SHOW_PHRASE' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-green-600">✓</span>
            </div>
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">
              PIN creado exitosamente
            </h2>
            <p className="text-sm text-[#666666] mb-4">
              Guarda esta frase de recuperación en un lugar seguro. La necesitarás si olvidas tu PIN.
            </p>
            <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-xl p-5 mb-6">
              <p className="text-xs text-[#666666] uppercase tracking-wider mb-2">Frase de recuperación</p>
              <p className="text-lg font-bold text-[#1A1A2E] leading-relaxed">{fraseGenerada}</p>
            </div>
            <p className="text-xs text-red-500 mb-6">
              Esta frase no se mostrara de nuevo. Anotala antes de continuar.
            </p>
            <Button
              onClick={() => {
                sessionStorage.setItem('cedula_activa', cedula.trim())
                router.push('/dashboard')
              }}
              className="w-full h-12 text-base font-semibold bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white"
            >
              Ya la guarde, continuar
            </Button>
          </div>
        )}

        {/* PASO: Olvidé mi PIN — enviar correo */}
        {step === 'FORGOT_PIN' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">
                Recupera tu PIN
              </h2>
              <p className="text-sm text-[#666666]">
                Te enviaremos un PIN provisional a tu correo registrado
              </p>
            </div>
            <form onSubmit={handleForgotPin} className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Número de cédula"
                value={cedula}
                onChange={(e) => {
                  setCedula(e.target.value.replace(/\D/g, ''))
                  setError('')
                }}
                className="h-12 text-lg text-center border-gray-300 focus:border-[#6B5CE7] focus:ring-[#6B5CE7]"
                disabled={loading}
                autoFocus
              />
              <Button
                type="submit"
                disabled={loading || !cedula.trim()}
                className="w-full h-12 text-base font-semibold bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  'Enviar PIN provisional'
                )}
              </Button>
            </form>
            <div className="mt-4">
              <button
                onClick={() => { setStep('LOGIN'); setError('') }}
                className="text-sm text-[#666666] hover:text-[#1A1A2E]"
              >
                Volver al login
              </button>
            </div>
          </>
        )}

        {/* PASO: Crear nuevo PIN después de provisional */}
        {step === 'RESET_PIN' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-green-600">&#10003;</span>
              </div>
              <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">
                Crea tu nuevo PIN
              </h2>
              <p className="text-sm text-[#666666]">
                Elige un nuevo PIN de 6 dígitos para tu cuenta
              </p>
            </div>
            <form onSubmit={handleResetPin} className="space-y-4">
              <div>
                <label className="text-xs text-[#666666] mb-1 block">Nuevo PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6 números"
                  value={nuevoPin}
                  onChange={(e) => {
                    setNuevoPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setError('')
                  }}
                  className="h-12 text-2xl text-center tracking-[0.5em] border-gray-300 focus:border-[#6B5CE7] focus:ring-[#6B5CE7]"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-[#666666] mb-1 block">Confirmar PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Repetir 6 dígitos"
                  value={pinConfirm}
                  onChange={(e) => {
                    setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))
                    setError('')
                  }}
                  className="h-12 text-2xl text-center tracking-[0.5em] border-gray-300 focus:border-[#6B5CE7] focus:ring-[#6B5CE7]"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                disabled={loading || nuevoPin.length !== 6 || pinConfirm.length !== 6}
                className="w-full h-12 text-base font-semibold bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  'Guardar nuevo PIN'
                )}
              </Button>
            </form>
          </>
        )}

        {/* Success */}
        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600 text-center">
            {success}
          </div>
        )}

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
