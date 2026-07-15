'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AdminUserModal } from '@/components/AdminUserModal'
import { Loader2, Search, LogOut, ChevronLeft, ChevronRight, ShieldCheck, CheckCircle2 } from 'lucide-react'
import type { AdminUsersResponse, AdminUserListItem } from '@/types'

function shortWallet(a: string | null): string {
  if (!a) return '—'
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export default function AdminPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [data, setData] = useState<AdminUsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)

  const fetchUsers = useCallback(async (p: number, q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users?page=${p}&search=${encodeURIComponent(q)}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      if (!res.ok) return
      setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [router])

  // Verificar sesión al montar
  useEffect(() => {
    fetch('/api/admin/me').then((res) => {
      if (res.status === 401) {
        router.push('/admin/login')
      } else {
        setAuthChecked(true)
      }
    })
  }, [router])

  useEffect(() => {
    if (authChecked) fetchUsers(page, search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, page])

  // Debounce de búsqueda
  useEffect(() => {
    if (!authChecked) return
    const t = setTimeout(() => {
      setPage(1)
      fetchUsers(1, search)
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <Loader2 className="h-6 w-6 animate-spin text-[#6B5CE7]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#6B5CE7]" />
          <h1 className="text-lg font-semibold text-[#1A1A2E]">Portal Administrativo</h1>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Salir
        </Button>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Búsqueda */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por cédula, nombre o correo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 bg-white"
            />
          </div>
          {data && (
            <span className="text-sm text-[#666]">
              {data.total} usuario{data.total === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#888] bg-gray-50 border-b border-gray-200">
                  <th className="py-3 px-4 font-medium">Cédula</th>
                  <th className="py-3 px-4 font-medium">Nombre</th>
                  <th className="py-3 px-4 font-medium">Correo</th>
                  <th className="py-3 px-4 font-medium">Tipo</th>
                  <th className="py-3 px-4 font-medium">Planes</th>
                  <th className="py-3 px-4 font-medium">Tokens (D/R/U)</th>
                  <th className="py-3 px-4 font-medium">Billetera</th>
                  <th className="py-3 px-4 font-medium text-center">Cert.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-[#6B5CE7] mx-auto" />
                    </td>
                  </tr>
                ) : data && data.users.length > 0 ? (
                  data.users.map((u: AdminUserListItem) => (
                    <tr
                      key={u.identificacion}
                      onClick={() => setSelected(u.identificacion)}
                      className="border-b border-gray-100 hover:bg-[#F8F7FF] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-[#1A1A2E]">{u.identificacion}</td>
                      <td className="py-3 px-4 text-[#1A1A2E]">{u.afiliado}</td>
                      <td className="py-3 px-4 text-[#666]">{u.correo || '—'}</td>
                      <td className="py-3 px-4 text-[#666]">{u.tipo || '—'}</td>
                      <td className="py-3 px-4 text-[#666]">
                        {u.planCodes.length > 0 ? u.planCodes.join(', ') : '—'}
                      </td>
                      <td className="py-3 px-4 text-[#666] whitespace-nowrap">
                        {u.tokensDisponibles.toLocaleString()} / {u.tokensReservados.toLocaleString()} /{' '}
                        {u.tokensUtilizados.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#666]">{shortWallet(u.wallet_address)}</td>
                      <td className="py-3 px-4 text-center">
                        {u.certificado_descargado ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-[#888]">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        {data && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-[#666]">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      <AdminUserModal
        cedula={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSaved={() => fetchUsers(page, search)}
      />
    </div>
  )
}
