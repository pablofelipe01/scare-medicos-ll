'use client'

import { Button } from '@/components/ui/button'

interface ActivateTokensBannerProps {
  onActivate: () => void
}

export function ActivateTokensBanner({ onActivate }: ActivateTokensBannerProps) {
  return (
    <div className="bg-[#EDE9FF] border-l-4 border-[#6B5CE7] rounded-r-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <p className="text-sm text-[#1A1A2E]">
        Tienes tokens SMT listos para activar en Polygon blockchain
      </p>
      <Button
        onClick={onActivate}
        className="bg-[#1A1A1A] hover:bg-[#333333] text-white text-sm font-semibold whitespace-nowrap"
      >
        ACTIVAR MIS TOKENS
      </Button>
    </div>
  )
}
