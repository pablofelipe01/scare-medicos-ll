import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashValue } from '@/lib/access-code'
import crypto from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { identificacion } = await request.json()

    if (!identificacion) {
      return NextResponse.json({ error: 'Cédula es requerida' }, { status: 400 })
    }

    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('correo, afiliado')
      .eq('identificacion', String(identificacion))
      .single()

    if (userError || !usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (!usuario.correo) {
      return NextResponse.json(
        { error: 'No tienes correo registrado. Contacta a ARGESSA.' },
        { status: 400 }
      )
    }

    // Generar PIN provisional de 6 dígitos
    const pinProvisional = String(crypto.randomInt(100000, 999999))
    const pinHash = await hashValue(pinProvisional)

    // Expira en 15 minutos
    const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('usuarios')
      .update({
        pin_provisional_hash: pinHash,
        pin_provisional_expira: expira,
      })
      .eq('identificacion', String(identificacion))

    // Enviar correo
    const { error: emailError } = await resend.emails.send({
      from: 'TokBox <no-reply@sylicon.tech>',
      to: usuario.correo,
      subject: 'Tu PIN provisional — TokBox',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1A1A2E; margin-bottom: 8px;">Hola, ${usuario.afiliado.split(' ')[0]}</h2>
          <p style="color: #666666; font-size: 14px; line-height: 1.6;">
            Recibimos una solicitud para recuperar tu PIN de acceso a TokBox.
          </p>
          <div style="background: #F5F5F5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <p style="color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
              Tu PIN provisional
            </p>
            <p style="font-size: 32px; font-weight: bold; color: #6B5CE7; letter-spacing: 8px; margin: 0;">
              ${pinProvisional}
            </p>
          </div>
          <p style="color: #666666; font-size: 14px; line-height: 1.6;">
            Este PIN es válido por <strong>15 minutos</strong>. Úsalo para ingresar y se te pedirá crear un nuevo PIN permanente.
          </p>
          <p style="color: #999999; font-size: 12px; margin-top: 24px;">
            Si no solicitaste este cambio, ignora este correo.
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Error al enviar correo' }, { status: 500 })
    }

    // Ocultar parte del correo para mostrar al usuario
    const [local, domain] = usuario.correo.split('@')
    const masked = local.slice(0, 2) + '***@' + domain

    return NextResponse.json({ success: true, correo: masked })
  } catch (error) {
    console.error('Error in forgot-pin:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
