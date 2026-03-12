import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyValue, hashValue } from '@/lib/access-code'

export async function POST(request: NextRequest) {
  try {
    const { identificacion, pinActual, nuevoPin } = await request.json()

    if (!identificacion || !pinActual || !nuevoPin) {
      return NextResponse.json(
        { error: 'Cédula, PIN actual y nuevo PIN son requeridos' },
        { status: 400 }
      )
    }

    if (!/^\d{6}$/.test(nuevoPin)) {
      return NextResponse.json({ error: 'El PIN debe ser de 6 dígitos' }, { status: 400 })
    }

    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('codigo_hash')
      .eq('identificacion', String(identificacion))
      .single()

    if (userError || !usuario || !usuario.codigo_hash) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar PIN actual
    const valid = await verifyValue(pinActual, usuario.codigo_hash)
    if (!valid) {
      return NextResponse.json({ error: 'PIN actual incorrecto' }, { status: 401 })
    }

    // Hashear nuevo PIN
    const codigoHash = await hashValue(nuevoPin)

    await supabaseAdmin
      .from('usuarios')
      .update({ codigo_hash: codigoHash })
      .eq('identificacion', String(identificacion))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in auth/change-pin:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
