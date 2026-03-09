'use client'

import { PlanToken, Usuario } from '@/types'
import { MetricCard } from './MetricCard'
import { ProgressBar } from './ProgressBar'
import { TokenChart } from './TokenChart'
import { AcelerarModal } from './AcelerarModal'
import { generateCertificate } from '@/lib/generate-certificate'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import { Download } from 'lucide-react'

interface PlanTabsProps {
  planes: PlanToken[]
  usuario: Usuario
}

export function PlanTabs({ planes, usuario }: PlanTabsProps) {
  const { toast } = useToast()

  // Obtener códigos de plan únicos, ordenados por fecha_vinculacion
  const planCodes = Array.from(new Set(planes.map((p) => p.codigo_plan)))
  const [activeTab, setActiveTab] = useState(planCodes[0] || '')

  // Filtrar planes del tab activo
  const activePlanes = planes.filter((p) => p.codigo_plan === activeTab)
  const disponibles = activePlanes
    .filter((p) => p.estado === 'DISPONIBLES')
    .reduce((sum, p) => sum + p.tokens, 0)
  const reservados = activePlanes
    .filter((p) => p.estado === 'RESERVADOS')
    .reduce((sum, p) => sum + p.tokens, 0)
  const utilizados = activePlanes
    .filter((p) => p.estado === 'UTILIZADOS')
    .reduce((sum, p) => sum + p.tokens, 0)

  const handleProximamente = () => {
    toast({
      title: 'Proximamente',
      description: 'Funcion disponible proximamente.',
    })
  }

  if (planCodes.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center text-[#666666]">
        No hay planes vinculados.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {planCodes.map((code) => (
          <button
            key={code}
            onClick={() => setActiveTab(code)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === code
                ? 'bg-[#6B5CE7] text-white'
                : 'bg-[#EEEEEE] text-[#666666] hover:bg-[#E0E0E0]'
            }`}
          >
            {code}
          </button>
        ))}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Aportes Utilizados" value={utilizados} variant="gray" />
        <MetricCard label="Aportes Disponibles" value={disponibles} variant="green" />
        <MetricCard label="Aportes Reservados" value={reservados} variant="blue" />
      </div>

      {/* Acelerar Button */}
      <div className="flex justify-end">
        <AcelerarModal />
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-6">
        <ProgressBar
          disponibles={disponibles}
          reservados={reservados}
          utilizados={utilizados}
        />
      </div>

      {/* Descargar Certificado */}
      <button
        onClick={() =>
          generateCertificate({
            usuario,
            codigoPlan: activeTab,
            disponibles,
            reservados,
            utilizados,
          })
        }
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-[#666666] hover:bg-gray-50 transition-colors"
      >
        <Download className="h-4 w-4" />
        Descargar Certificado
      </button>

      {/* Chart */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#1A1A2E] mb-4">Aportes Realizados</h3>
        <TokenChart planes={activePlanes} />
      </div>

      {/* Descargar Aportes */}
      <button
        onClick={handleProximamente}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-[#666666] hover:bg-gray-50 transition-colors"
      >
        <Download className="h-4 w-4" />
        Descargar Aportes
      </button>
    </div>
  )
}
