import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyValue, hashValue } from '@/lib/access-code'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { identificacion, pin } = await request.json()

    if (!identificacion || !pin) {
      return NextResponse.json({ error: 'Cédula y PIN son requeridos' }, { status: 400 })
    }

    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('codigo_hash, pin_provisional_hash, pin_provisional_expira')
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

    // Intentar con PIN permanente
    const valid = await verifyValue(pin, usuario.codigo_hash)
    if (valid) {
      return NextResponse.json({ success: true })
    }

    // Intentar con PIN provisional
    if (usuario.pin_provisional_hash && usuario.pin_provisional_expira) {
      const expira = new Date(usuario.pin_provisional_expira)
      if (expira > new Date()) {
        const validProvisional = await verifyValue(pin, usuario.pin_provisional_hash)
        if (validProvisional) {
          // Generar token de reset y limpiar PIN provisional
          const resetToken = crypto.randomBytes(32).toString('hex')
          const resetTokenHash = await hashValue(resetToken)

          await supabaseAdmin
            .from('usuarios')
            .update({
              pin_provisional_hash: null,
              pin_provisional_expira: null,
              reset_token_hash: resetTokenHash,
              reset_token_expira: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            })
            .eq('identificacion', String(identificacion))

          return NextResponse.json({ success: true, provisional: true, resetToken })
        }
      }
    }

    return NextResponse.json({ error: 'PIN incorrecto' }, { status: 401 })
  } catch (error) {
    console.error('Error in auth/login:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
