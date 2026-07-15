import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getSessionFromRequest, unauthorizedResponse } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Base URL de la API Sylicon (Certificados). Configurable por env var porque SCARE
// debe confirmar el host/puerto correcto: el de la especificación
// (apiintsylicon.scare.org.co) no resuelve en DNS y el puerto :9372 del host de
// integración hace timeout. Cuando SCARE confirme, se ajusta SCARE_CERT_BASE_URL en Vercel.
const SYLICON_BASE_URL =
  process.env.SCARE_CERT_BASE_URL || 'https://apiintsylicon.scare.org.co:9372'

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return unauthorizedResponse()

    // La cédula se toma de la sesión: un usuario solo puede pedir su propio certificado.
    const cedula = session.cedula
    if (!cedula) {
      return NextResponse.json({ error: 'Cédula no disponible en la sesión' }, { status: 400 })
    }

    // Generar JWT para la API Sylicon (source: 'scare', HS256, vigencia 1h)
    const secret = process.env.SCARE_JWT_SECRET
    if (!secret) {
      console.error('SCARE_JWT_SECRET not configured')
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    const token = jwt.sign({ source: 'scare' }, secret, {
      algorithm: 'HS256',
      expiresIn: '1h',
    })

    let scareRes: Response
    try {
      scareRes = await fetch(
        `${SYLICON_BASE_URL}/api/certificadointegracion?cedula=${encodeURIComponent(cedula)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )
    } catch (fetchErr) {
      const cause = (fetchErr as { cause?: { code?: string } }).cause
      console.error('SCARE certificadointegracion connection error:', cause?.code, SYLICON_BASE_URL)
      return NextResponse.json(
        { error: 'No se pudo conectar con el servicio de certificados' },
        { status: 502 }
      )
    }

    if (!scareRes.ok) {
      console.error('SCARE certificadointegracion error:', scareRes.status)
      const status = scareRes.status === 401 ? 502 : 502
      return NextResponse.json({ error: 'Error al obtener el certificado' }, { status })
    }

    const data = await scareRes.json()

    // La API devuelve null (o cuerpo vacío) cuando no existe certificado para la cédula.
    if (!data || !data.AFILIADO) {
      return NextResponse.json(
        { error: 'No se encontró certificado de integración para esta identificación' },
        { status: 404 }
      )
    }

    // Registrar la descarga del certificado (visible en el portal administrativo)
    await supabaseAdmin
      .from('usuarios')
      .update({ certificado_descargado: new Date().toISOString() })
      .eq('identificacion', cedula)

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error fetching certificado de integración:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
