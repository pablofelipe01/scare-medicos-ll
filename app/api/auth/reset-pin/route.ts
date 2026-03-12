import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashValue, verifyValue } from '@/lib/access-code'

export async function POST(request: NextRequest) {
  try {
    const { identificacion, nuevoPin, resetToken } = await request.json()

    if (!identificacion || !nuevoPin || !resetToken) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    if (!/^\d{6}$/.test(nuevoPin)) {
      return NextResponse.json({ error: 'El PIN debe ser de 6 dígitos' }, { status: 400 })
    }

    // Verificar que el reset token sea válido
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('reset_token_hash, reset_token_expira')
      .eq('identificacion', String(identificacion))
      .single()

    if (userError || !usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (!usuario.reset_token_hash || !usuario.reset_token_expira) {
      return NextResponse.json({ error: 'No hay solicitud de reset activa' }, { status: 403 })
    }

    const expira = new Date(usuario.reset_token_expira)
    if (expira < new Date()) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 403 })
    }

    const validToken = await verifyValue(resetToken, usuario.reset_token_hash)
    if (!validToken) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
    }

    // Token válido — guardar nuevo PIN y limpiar token
    const codigoHash = await hashValue(nuevoPin)

    await supabaseAdmin
      .from('usuarios')
      .update({
        codigo_hash: codigoHash,
        reset_token_hash: null,
        reset_token_expira: null,
      })
      .eq('identificacion', String(identificacion))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in reset-pin:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
