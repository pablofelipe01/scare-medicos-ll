interface MetricCardProps {
  label: string
  value: number
  variant?: 'default' | 'green' | 'blue' | 'gray'
}

const variantStyles = {
  default: 'border-gray-200',
  green: 'border-[#2E7D32]',
  blue: 'border-[#1565C0]',
  gray: 'border-gray-300',
}

export function MetricCard({ label, value, variant = 'default' }: MetricCardProps) {
  return (
    <div className={`bg-white rounded-xl p-5 border-2 ${variantStyles[variant]}`}>
      <p className="text-xs text-[#666666] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#1A1A2E]">{value.toLocaleString()}</p>
    </div>
  )
}
