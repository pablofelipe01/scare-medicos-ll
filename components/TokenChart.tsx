'use client'

import { PlanToken } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface TokenChartProps {
  planes: PlanToken[]
}

function getLast15Months(): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = []
  const now = new Date()

  for (let i = 14; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`
    months.push({ key, label })
  }

  return months
}

export function TokenChart({ planes }: TokenChartProps) {
  const months = getLast15Months()

  // Agrupar tokens por mes de fecha_vinculacion
  const tokensByMonth: Record<string, number> = {}
  for (const plan of planes) {
    if (plan.fecha_vinculacion) {
      const d = new Date(plan.fecha_vinculacion)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      tokensByMonth[key] = (tokensByMonth[key] || 0) + plan.tokens
    }
  }

  const data = months.map((m) => ({
    name: m.label,
    tokens: tokensByMonth[m.key] || 0,
  }))

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEEE" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#666666', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#666666', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #EEEEEE',
              borderRadius: '8px',
              fontSize: '14px',
            }}
            formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
          />
          <Bar dataKey="tokens" fill="#6B5CE7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
