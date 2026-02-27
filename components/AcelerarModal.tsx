'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function AcelerarModal() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-[#1A1A1A] hover:bg-[#333333] text-white font-semibold">
          ACELERAR APORTES
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Acelerar Aportes</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-center">
          <p className="text-sm text-[#666666]">
            Para acelerar tus aportes, contacta a tu asesor SCARE.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
