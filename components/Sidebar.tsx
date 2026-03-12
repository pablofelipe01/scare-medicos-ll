'use client'

import { useRef, useState } from 'react'
import { Usuario, PlanToken } from '@/types'
import { formatDate } from '@/lib/format'
import { AcelerarModal } from './AcelerarModal'
import { ChangePinModal } from './ChangePinModal'
import { useToast } from '@/hooks/use-toast'
import { FileText, ChevronDown, ChevronUp, Camera } from 'lucide-react'

interface SidebarProps {
  usuario: Usuario
  planes: PlanToken[]
  totalPorUsar: number
  onLogout: () => void
}

export function Sidebar({ usuario, planes, totalPorUsar, onLogout }: SidebarProps) {
  const { toast } = useToast()
  const [changePinOpen, setChangePinOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(usuario.avatar_url)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('identificacion', usuario.identificacion)

      const res = await fetch('/api/user/avatar', { method: 'POST', body: formData })
      const data = await res.json()

      if (res.ok) {
        setAvatarUrl(data.avatar_url)
        toast({ title: 'Foto actualizada' })
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo subir la foto', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative group w-20 h-20 rounded-full mb-3"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={usuario.afiliado}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#EDE9FF] flex items-center justify-center">
              <span className="text-2xl font-bold text-[#6B5CE7]">{initials}</span>
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-5 w-5 text-white" />
          </div>
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
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

      {/* Documentos */}
      <div className="mb-6">
        <button
          onClick={() => setDocsOpen(!docsOpen)}
          className="flex items-center justify-between w-full text-sm font-medium text-[#1A1A2E] hover:text-[#6B5CE7] transition-colors"
        >
          <span>Documentos</span>
          {docsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {docsOpen && (
          <div className="mt-3 space-y-2">
            {[
              { label: 'Contrato de Mandato', url: '#' },
              { label: 'Autorización Datos Personales FEVS', url: '#' },
              { label: 'Solicitud de Integración AES Colectivo', url: '#' },
              { label: 'Contrato de Tokenización', url: '#' },
            ].map((doc) => (
              <a
                key={doc.label}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F9F9F9] hover:bg-[#EDE9FF] text-xs text-[#666666] hover:text-[#6B5CE7] transition-colors"
              >
                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{doc.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <hr className="mb-6" />

      {/* Tokens por Usar */}
      <div className="bg-[#F9F9F9] rounded-xl p-4 mb-4">
        <p className="text-xs text-[#666666] uppercase tracking-wider mb-1">Tokens por Usar</p>
        <p className="text-3xl font-bold text-[#1A1A2E]">{totalPorUsar.toLocaleString()}</p>
      </div>

      <div className="space-y-1 text-sm text-[#666666] mb-6">
        <p>Próximo token: <span className="font-medium">Por definir</span></p>
        <p>Último token: <span className="font-medium">{formatDate(lastVinculacion || null)}</span></p>
      </div>

      {/* Acelerar Tokens */}
      {usuario.tipo !== 'ANTIGUO' && <AcelerarModal />}

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
