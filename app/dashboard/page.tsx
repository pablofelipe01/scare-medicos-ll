'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardData } from '@/types'
import { Sidebar } from '@/components/Sidebar'
import { PlanTabs } from '@/components/PlanTabs'
import { ActivateTokensBanner } from '@/components/ActivateTokensBanner'
import { ActivateTokensModal } from '@/components/ActivateTokensModal'
import { SkeletonDashboard } from '@/components/SkeletonDashboard'
import { useToast } from '@/hooks/use-toast'

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cedula, setCedula] = useState<string | null>(null)

  // Activate modal state
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [activateStatus, setActivateStatus] = useState<'loading' | 'success' | 'error'>('loading')

  const fetchData = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/user/tokens/${id}`, { cache: 'no-store' })
      if (!res.ok) {
        router.push('/')
        return
      }
      const dashboardData: DashboardData = await res.json()
      setData(dashboardData)
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [router, toast])

  useEffect(() => {
    const storedCedula = sessionStorage.getItem('cedula_activa')
    if (!storedCedula) {
      router.push('/')
      return
    }
    setCedula(storedCedula)
    fetchData(storedCedula)
  }, [fetchData, router])

  const handleLogout = () => {
    sessionStorage.removeItem('cedula_activa')
    router.push('/')
  }

  const handleActivateTokens = async () => {
    if (!cedula) return

    setActivateModalOpen(true)
    setActivateStatus('loading')

    try {
      const res = await fetch('/api/user/activate-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificacion: cedula }),
      })

      if (!res.ok) {
        setActivateStatus('error')
        return
      }

      setActivateStatus('success')
      // Refresh dashboard data
      await fetchData(cedula)
    } catch {
      setActivateStatus('error')
    }
  }

  if (loading || !data) {
    return <SkeletonDashboard />
  }

  const { usuario, planes, totalDisponibles } = data
  const showBanner = !usuario.tokens_activados && planes.some((p) => p.estado === 'DISPONIBLES')

  // Initials for top bar avatar
  const initials = usuario.afiliado
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F5F5F5]">
      {/* Sidebar */}
      <Sidebar
        usuario={usuario}
        planes={planes}
        totalDisponibles={totalDisponibles}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <img src="/Negativo.png" alt="TokBox" className="h-8" />
          <div className="w-10 h-10 rounded-full bg-[#EDE9FF] flex items-center justify-center">
            <span className="text-sm font-bold text-[#6B5CE7]">{initials}</span>
          </div>
        </div>

        {/* Activate Banner */}
        {showBanner && (
          <div className="mb-6">
            <ActivateTokensBanner onActivate={handleActivateTokens} />
          </div>
        )}

        {/* Plan Tabs + Content */}
        <PlanTabs planes={planes} usuario={usuario} />

        {/* Activate Modal */}
        <ActivateTokensModal
          open={activateModalOpen}
          onOpenChange={setActivateModalOpen}
          status={activateStatus}
          walletAddress={usuario.wallet_address || undefined}
        />
      </main>
    </div>
  )
}
