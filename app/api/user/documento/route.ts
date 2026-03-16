import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getSessionFromRequest, unauthorizedResponse } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return unauthorizedResponse()

    const filekey = request.nextUrl.searchParams.get('filekey')

    if (!filekey) {
      return NextResponse.json({ error: 'filekey es requerido' }, { status: 400 })
    }

    // Generar JWT para SCARE API
    const secret = process.env.SCARE_JWT_SECRET
    if (!secret) {
      console.error('SCARE_JWT_SECRET not configured')
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    const token = jwt.sign({ source: 'scare' }, secret, {
      algorithm: 'HS256',
      expiresIn: '1h',
    })

    // Llamar al API de SCARE
    const scareRes = await fetch(
      `https://apiintegracionsylicon.scare.org.co:9374/api/obtenerdocumento?keyfile=${encodeURIComponent(filekey)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    )

    if (!scareRes.ok) {
      console.error('SCARE API error:', scareRes.status)
      return NextResponse.json({ error: 'Error al obtener documento' }, { status: 502 })
    }

    const data = await scareRes.json()

    if (!data.contenido) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    // Convertir base64 a buffer y devolver como PDF
    const pdfBuffer = Buffer.from(data.contenido, 'base64')
    const filename = data.nombre || 'documento.pdf'

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error fetching documento:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
