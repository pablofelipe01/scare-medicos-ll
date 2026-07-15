import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getSessionFromRequest, unauthorizedResponse } from '@/lib/auth'

// Base URL de la API Sylicon (Certificados) — instancia distinta a la de documentos.
const SYLICON_BASE_URL = 'https://apiintsylicon.scare.org.co:9372'

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

    const scareRes = await fetch(
      `${SYLICON_BASE_URL}/api/certificadointegracion?cedula=${encodeURIComponent(cedula)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    )

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

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error fetching certificado de integración:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
