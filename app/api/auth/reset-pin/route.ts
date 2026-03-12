import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashValue } from '@/lib/access-code'

export async function POST(request: NextRequest) {
  try {
    const { identificacion, nuevoPin } = await request.json()

    if (!identificacion || !nuevoPin) {
      return NextResponse.json({ error: 'Cédula y nuevo PIN son requeridos' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(nuevoPin)) {
      return NextResponse.json({ error: 'El PIN debe ser de 6 dígitos' }, { status: 400 })
    }

    const codigoHash = await hashValue(nuevoPin)

    await supabaseAdmin
      .from('usuarios')
      .update({ codigo_hash: codigoHash })
      .eq('identificacion', String(identificacion))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in reset-pin:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
