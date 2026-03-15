import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashValue } from '@/lib/access-code'
import { setSessionCookie } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { identificacion, pin } = await request.json()

    if (!identificacion || !pin) {
      return NextResponse.json({ error: 'Cédula y PIN son requeridos' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json({ error: 'El PIN debe ser de 6 dígitos' }, { status: 400 })
    }

    // Verificar que el usuario existe y no tiene codigo configurado
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('afiliado, codigo_hash')
      .eq('identificacion', String(identificacion))
      .single()

    if (userError || !usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (usuario.codigo_hash) {
      return NextResponse.json(
        { error: 'Este usuario ya tiene un PIN configurado' },
        { status: 409 }
      )
    }

    // Hashear PIN
    const codigoHash = await hashValue(pin)

    // Guardar en DB
    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({ codigo_hash: codigoHash })
      .eq('identificacion', String(identificacion))

    if (updateError) {
      console.error('Error saving PIN:', updateError)
      return NextResponse.json({ error: 'Error interno' }, { status: 500 })
    }

    const response = NextResponse.json({ success: true })
    return setSessionCookie(response, String(identificacion))
  } catch (error) {
    console.error('Error in auth/setup:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
