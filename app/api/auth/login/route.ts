import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyValue } from '@/lib/access-code'

export async function POST(request: NextRequest) {
  try {
    const { identificacion, pin } = await request.json()

    if (!identificacion || !pin) {
      return NextResponse.json({ error: 'Cedula y PIN son requeridos' }, { status: 400 })
    }

    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('codigo_hash')
      .eq('identificacion', String(identificacion))
      .single()

    if (userError || !usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (!usuario.codigo_hash) {
      return NextResponse.json(
        { error: 'Usuario no ha configurado su PIN' },
        { status: 403 }
      )
    }

    const valid = await verifyValue(pin, usuario.codigo_hash)
    if (!valid) {
      return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in auth/login:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
