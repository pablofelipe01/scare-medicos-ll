'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ChangePinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  identificacion: string
}

export function ChangePinModal({ open, onOpenChange, identificacion }: ChangePinModalProps) {
  const { toast } = useToast()
  const [pinActual, setPinActual] = useState('')
  const [nuevoPin, setNuevoPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (nuevoPin.length !== 6) {
      setError('El nuevo PIN debe ser de 6 digitos.')
      return
    }

    if (nuevoPin !== confirmPin) {
      setError('Los PIN no coinciden.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificacion, pinActual, nuevoPin }),
      })

      if (res.status === 401) {
        setError('PIN actual incorrecto.')
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError('Error al cambiar el PIN.')
        setLoading(false)
        return
      }

      toast({ title: 'PIN actualizado', description: 'Tu PIN ha sido cambiado exitosamente.' })
      setPinActual('')
      setNuevoPin('')
      setConfirmPin('')
      onOpenChange(false)
    } catch {
      setError('Error de conexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) { setPinActual(''); setNuevoPin(''); setConfirmPin(''); setError('') }
      onOpenChange(v)
    }}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Cambiar PIN</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-xs text-[#666666] mb-1 block">PIN actual</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 digitos"
              value={pinActual}
              onChange={(e) => { setPinActual(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
              className="h-11 text-xl text-center tracking-[0.5em]"
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-xs text-[#666666] mb-1 block">Nuevo PIN</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 digitos"
              value={nuevoPin}
              onChange={(e) => { setNuevoPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
              className="h-11 text-xl text-center tracking-[0.5em]"
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-xs text-[#666666] mb-1 block">Confirmar nuevo PIN</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="6 digitos"
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
              className="h-11 text-xl text-center tracking-[0.5em]"
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
          <Button
            type="submit"
            disabled={loading || pinActual.length !== 6 || nuevoPin.length !== 6 || confirmPin.length !== 6}
            className="w-full h-11 font-semibold bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cambiando...
              </span>
            ) : (
              'Cambiar PIN'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
