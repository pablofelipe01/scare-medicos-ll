'use client'

import { useState } from 'react'
import { Usuario, PlanToken } from '@/types'
import { formatDate } from '@/lib/format'
import { AcelerarModal } from './AcelerarModal'
import { ChangePinModal } from './ChangePinModal'
import { useToast } from '@/hooks/use-toast'

interface SidebarProps {
  usuario: Usuario
  planes: PlanToken[]
  totalDisponibles: number
  onLogout: () => void
}

export function Sidebar({ usuario, planes, totalDisponibles, onLogout }: SidebarProps) {
  const { toast } = useToast()
  const [changePinOpen, setChangePinOpen] = useState(false)

  // Obtener iniciales
  const initials = usuario.afiliado
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  // Última fecha de vinculación
  const lastVinculacion = planes
    .filter((p) => p.fecha_vinculacion)
    .sort((a, b) => new Date(b.fecha_vinculacion!).getTime() - new Date(a.fecha_vinculacion!).getTime())[0]
    ?.fecha_vinculacion

  return (
    <aside className="w-full lg:w-[280px] bg-white lg:min-h-screen p-6 flex flex-col border-r border-gray-100">
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-[#EDE9FF] flex items-center justify-center mb-3">
          <span className="text-2xl font-bold text-[#6B5CE7]">{initials}</span>
        </div>
        <h2 className="text-lg font-bold text-[#1A1A2E] text-center">{usuario.afiliado}</h2>
        {(usuario.profesion || usuario.especialidad) && (
          <p className="text-sm italic text-[#666666] text-center">
            {[usuario.profesion, usuario.especialidad].filter(Boolean).join(' — ')}
          </p>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1 mb-6 text-sm text-[#666666]">
        <p>Integrado desde: {formatDate(usuario.fecha_creacion)}</p>
        <p>
          Contrato N.{' '}
          <span className="text-[#6B5CE7] underline">{usuario.identificacion}</span>
        </p>
      </div>

      <hr className="mb-6" />

      {/* Tokens Disponibles */}
      <div className="bg-[#F9F9F9] rounded-xl p-4 mb-4">
        <p className="text-xs text-[#666666] uppercase tracking-wider mb-1">Tokens Disponibles</p>
        <p className="text-3xl font-bold text-[#1A1A2E]">{totalDisponibles.toLocaleString()}</p>
      </div>

      <div className="space-y-1 text-sm text-[#666666] mb-6">
        <p>Próximo token: <span className="font-medium">Por definir</span></p>
        <p>Último token: <span className="font-medium">{formatDate(lastVinculacion || null)}</span></p>
      </div>

      {/* Acelerar Aportes */}
      <AcelerarModal />

      {/* Footer links */}
      <div className="mt-auto pt-6 space-y-3">
        <button
          onClick={() => setChangePinOpen(true)}
          className="text-sm text-[#6B5CE7] hover:underline block"
        >
          Cambiar PIN
        </button>
        <button
          onClick={onLogout}
          className="text-sm text-[#666666] hover:text-[#1A1A2E] block"
        >
          Cerrar Sesión
        </button>
      </div>

      <ChangePinModal
        open={changePinOpen}
        onOpenChange={setChangePinOpen}
        identificacion={usuario.identificacion}
      />
    </aside>
  )
}
