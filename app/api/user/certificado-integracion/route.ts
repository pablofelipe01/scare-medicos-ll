import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getSessionFromRequest, unauthorizedResponse } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Base URL de la API Sylicon (Certificados). Configurable por env var.
// SCARE publicó el DNS de pruebas el 2026-07-17: apiintsyliconpruebas.scare.org.co
// (resuelve a 200.93.163.210) en el puerto :9389. Swagger en /swagger/index.html.
// Se puede sobreescribir con SCARE_CERT_BASE_URL en Vercel.
// .trim() + quitar '/' final: la env var en Vercel puede traer espacios o barra
// sobrante que romperían la URL construida (ERR_INVALID_URL).
const SYLICON_BASE_URL = (
  process.env.SCARE_CERT_BASE_URL || 'https://apiintsyliconpruebas.scare.org.co:9389'
)
  .trim()
  .replace(/\/+$/, '')

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
          // No cachear: el certificado debe consultarse en vivo cada vez. Sin esto,
          // Next.js sirve respuestas cacheadas (p. ej. un 404 viejo) desde el Data Cache.
          cache: 'no-store',
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
      return NextResponse.json({ error: 'Error al obtener el certificado' }, { status: 502 })
    }

    const data = await scareRes.json()

    // La API de SCARE responde SIEMPRE 200; cuando no hay integrado para la cédula
    // devuelve el objeto con `afiliado: null`. Los nombres de campo llegan en
    // minúscula/mixto (afiliado, fechA_CERTIFICADO, …) — se aceptan ambas grafías.
    const afiliado = data?.afiliado ?? data?.AFILIADO
    if (!data || !afiliado) {
      return NextResponse.json(
        { error: 'No se encontró certificado de integración para esta identificación' },
        { status: 404 }
      )
    }

    // Normalizar al formato que espera el generador del PDF (CertificadoIntegracion).
    const certificado = {
      AFILIADO: afiliado,
      IDENTIFICACION: data.identificacion ?? data.IDENTIFICACION ?? cedula,
      ESPECIALIDADES: data.especialidades ?? data.ESPECIALIDADES ?? '',
      FECHA_INTEGRACION: data.fechA_INTEGRACION ?? data.FECHA_INTEGRACION ?? '',
      FECHA_CERTIFICADO: data.fechA_CERTIFICADO ?? data.FECHA_CERTIFICADO ?? '',
      FIRMA: data.firma ?? data.FIRMA ?? '',
      CARGO: data.cargo ?? data.CARGO ?? '',
    }

    // Registrar la descarga del certificado (visible en el portal administrativo)
    await supabaseAdmin
      .from('usuarios')
      .update({ certificado_descargado: new Date().toISOString() })
      .eq('identificacion', cedula)

    return NextResponse.json(certificado, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error fetching certificado de integración:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
