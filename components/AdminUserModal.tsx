'use client'

import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { AdminUserDetail } from '@/types'

interface Props {
  cedula: string | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

interface FormState {
  identificacion: string
  afiliado: string
  correo: string
  profesion: string
  especialidad: string
  tipo: string
  nombre_plan: string
}

function fmtDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-[#888] mb-0.5">{label}</div>
      <div className="text-sm text-[#1A1A2E] break-words">{children}</div>
    </div>
  )
}

function Badge({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {ok ? yes : no}
    </span>
  )
}

export function AdminUserModal({ cedula, open, onClose, onSaved }: Props) {
  const { toast } = useToast()
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setDetail(null)
    setForm(null)
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`)
      if (!res.ok) {
        toast({ title: 'Error', description: 'No se pudo cargar el usuario.', variant: 'destructive' })
        onClose()
        return
      }
      const d = (await res.json()) as AdminUserDetail
      setDetail(d)
      setForm({
        identificacion: d.identificacion,
        afiliado: d.afiliado || '',
        correo: d.correo || '',
        profesion: d.profesion || '',
        especialidad: d.especialidad || '',
        tipo: d.tipo || '',
        nombre_plan: d.nombre_plan || '',
      })
    } finally {
      setLoading(false)
    }
  }, [onClose, toast])

  useEffect(() => {
    if (open && cedula) load(cedula)
  }, [open, cedula, load])

  const set = (k: keyof FormState, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const cedulaChanged = !!(detail && form && form.identificacion.trim() !== detail.identificacion)

  const handleSave = async () => {
    if (!detail || !form) return
    if (!form.afiliado.trim()) {
      toast({ title: 'Falta el nombre', description: 'El nombre no puede estar vacío.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(detail.identificacion)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identificacion: form.identificacion.trim(),
          afiliado: form.afiliado.trim(),
          correo: form.correo.trim(),
          profesion: form.profesion.trim(),
          especialidad: form.especialidad.trim(),
          tipo: form.tipo.trim(),
          nombre_plan: form.nombre_plan.trim(),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'No se pudo guardar', description: body.error || 'Intenta de nuevo.', variant: 'destructive' })
        return
      }
      setDetail(body as AdminUserDetail)
      toast({ title: 'Guardado', description: 'Cambios aplicados correctamente.' })
      onSaved()
      onClose()
    } catch {
      toast({ title: 'Error', description: 'Error de conexión.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const copyWallet = () => {
    if (!detail?.wallet_address) return
    navigator.clipboard.writeText(detail.wallet_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const docs = detail
    ? [
        { n: detail.doc1_nombre, k: detail.doc1_filekey },
        { n: detail.doc2_nombre, k: detail.doc2_filekey },
        { n: detail.doc3_nombre, k: detail.doc3_filekey },
        { n: detail.doc4_nombre, k: detail.doc4_filekey },
      ].filter((d) => d.n)
    : []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1A1A2E]">Detalle del usuario</DialogTitle>
        </DialogHeader>

        {loading || !detail || !form ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#6B5CE7]" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sección editable */}
            <section>
              <h3 className="text-sm font-semibold text-[#6B5CE7] mb-3">Datos editables</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#666] mb-1 block">Cédula</label>
                  <Input value={form.identificacion} onChange={(e) => set('identificacion', e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
                </div>
                <div>
                  <label className="text-xs text-[#666] mb-1 block">Nombre (afiliado)</label>
                  <Input value={form.afiliado} onChange={(e) => set('afiliado', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#666] mb-1 block">Correo</label>
                  <Input value={form.correo} onChange={(e) => set('correo', e.target.value)} type="email" />
                </div>
                <div>
                  <label className="text-xs text-[#666] mb-1 block">Tipo</label>
                  <Input value={form.tipo} onChange={(e) => set('tipo', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#666] mb-1 block">Profesión</label>
                  <Input value={form.profesion} onChange={(e) => set('profesion', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#666] mb-1 block">Especialidad</label>
                  <Input value={form.especialidad} onChange={(e) => set('especialidad', e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[#666] mb-1 block">Nombre del plan</label>
                  <Input value={form.nombre_plan} onChange={(e) => set('nombre_plan', e.target.value)} />
                </div>
              </div>

              {cedulaChanged && (
                <div className="mt-3 flex gap-2 items-start p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Vas a cambiar la <strong>cédula</strong>. Se actualizarán en cascada los planes vinculados.
                    La billetera guardada <strong>no</strong> se recalcula.
                  </span>
                </div>
              )}
            </section>

            {/* Sección solo lectura */}
            <section>
              <h3 className="text-sm font-semibold text-[#888] mb-3">Solo lectura</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Billetera">
                  {detail.wallet_address ? (
                    <span className="inline-flex items-center gap-2 font-mono text-xs">
                      {detail.wallet_address}
                      <button onClick={copyWallet} className="text-[#6B5CE7] hover:text-[#5A4BD6]">
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </span>
                  ) : (
                    'No asignada'
                  )}
                </Field>
                <Field label="Estado billetera / tokens">
                  <span className="flex gap-2">
                    <Badge ok={detail.wallet_creada} yes="Billetera creada" no="Sin billetera" />
                    <Badge ok={detail.tokens_activados} yes="Tokens activados" no="Sin activar" />
                  </span>
                </Field>
                <Field label="Certificado descargado">
                  {detail.certificado_descargado ? (
                    <span className="text-green-700">{fmtDate(detail.certificado_descargado)}</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </Field>
                <Field label="PIN configurado">
                  <Badge ok={detail.codigo_configurado} yes="Sí" no="No" />
                </Field>
                <Field label="Fecha de creación">{fmtDate(detail.fecha_creacion)}</Field>
                <Field label="Fecha de activación">{fmtDate(detail.fecha_activacion)}</Field>
              </div>
            </section>

            {/* Planes */}
            <section>
              <h3 className="text-sm font-semibold text-[#888] mb-3">Planes ({detail.planes.length})</h3>
              {detail.planes.length === 0 ? (
                <p className="text-sm text-gray-400">Sin planes vinculados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[#888] border-b border-gray-200">
                        <th className="py-2 pr-3">Plan</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2 pr-3">Tokens</th>
                        <th className="py-2 pr-3">Vinculación</th>
                        <th className="py-2 pr-3">Tx Mint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.planes.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="py-2 pr-3 font-medium">{p.codigo_plan}</td>
                          <td className="py-2 pr-3">{p.estado}</td>
                          <td className="py-2 pr-3">{p.tokens.toLocaleString()}</td>
                          <td className="py-2 pr-3">{p.fecha_vinculacion ? fmtDate(p.fecha_vinculacion) : '—'}</td>
                          <td className="py-2 pr-3 font-mono">
                            {p.tx_hash_mint ? `${p.tx_hash_mint.slice(0, 10)}…` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Documentos */}
            {docs.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-[#888] mb-3">Documentos</h3>
                <ul className="list-disc pl-5 text-sm text-[#1A1A2E] space-y-1">
                  {docs.map((d, i) => (
                    <li key={i}>{d.n}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#6B5CE7] hover:bg-[#5A4BD6] text-white"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
