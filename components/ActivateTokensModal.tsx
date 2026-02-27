'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { formatWallet } from '@/lib/format'

interface ActivateTokensModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: 'loading' | 'success' | 'error'
  walletAddress?: string
}

export function ActivateTokensModal({
  open,
  onOpenChange,
  status,
  walletAddress,
}: ActivateTokensModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            {status === 'loading' && 'Activando Tokens'}
            {status === 'success' && 'Tokens Activados'}
            {status === 'error' && 'Error'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 gap-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-[#6B5CE7]" />
              <p className="text-sm text-[#666666] text-center">
                Acreditando tus tokens SMT en Polygon...
                <br />
                esto puede tomar unos segundos
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              {walletAddress && (
                <p className="text-sm font-mono bg-gray-100 px-3 py-1 rounded text-[#1A1A2E]">
                  {formatWallet(walletAddress)}
                </p>
              )}
              <p className="text-sm text-green-600 font-medium">
                Tokens acreditados exitosamente
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-sm text-red-600">
                Error al activar tokens. Intenta nuevamente.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
