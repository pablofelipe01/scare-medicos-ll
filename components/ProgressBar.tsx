interface ProgressBarProps {
  disponibles: number
  reservados: number
  utilizados: number
}

export function ProgressBar({ disponibles, reservados, utilizados }: ProgressBarProps) {
  const total = disponibles + reservados + utilizados
  if (total === 0) return null

  const pctUtilizados = (utilizados / total) * 100
  const pctDisponibles = (disponibles / total) * 100
  const pctReservados = (reservados / total) * 100

  return (
    <div className="w-full">
      <div className="flex h-3 rounded-full overflow-hidden">
        {pctUtilizados > 0 && (
          <div
            className="bg-[#1A1A2E] transition-all duration-500"
            style={{ width: `${pctUtilizados}%` }}
          />
        )}
        {pctDisponibles > 0 && (
          <div
            className="bg-[#6B5CE7] transition-all duration-500"
            style={{ width: `${pctDisponibles}%` }}
          />
        )}
        {pctReservados > 0 && (
          <div
            className="bg-[#EEEEEE] transition-all duration-500"
            style={{ width: `${pctReservados}%` }}
          />
        )}
      </div>
      <div className="flex justify-between mt-2 text-xs text-[#666666]">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#1A1A2E] inline-block" />
          Utilizados {pctUtilizados.toFixed(0)}%
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#6B5CE7] inline-block" />
          Por Usar {pctDisponibles.toFixed(0)}%
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#EEEEEE] border border-gray-300 inline-block" />
          Máximos Posibles 100%
        </div>
      </div>
    </div>
  )
}
