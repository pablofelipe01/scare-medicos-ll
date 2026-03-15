import { NextRequest, NextResponse } from 'next/server'
import { verifyScareJWT } from '@/lib/jwt'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getWalletAddress } from '@/lib/wallet'

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown> = {}

  try {
    // 1. Verificar JWT HS256
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    if (!verifyScareJWT(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parsear body
    payload = await request.json()

    // 3. Registrar en webhook_logs
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    await supabaseAdmin.from('webhook_logs').insert({
      evento: 'REGISTRO',
      payload_raw: payload,
      status: 'PROCESSING',
      ip_origen: ip,
    })

    // 4. Validar campos requeridos (SCARE puede enviar números en vez de strings)
    const raw = payload as {
      IDENTIFICACION: string | number
      AFILIADO: string
      PROFESION: string
      ESPECIALIDAD: string
      NOMBRE_PLAN: string
      CORREO: string
      TIPO: string
      PLANES: Array<{
        IDENTIFICACION: string | number
        FECHA_VINCULACION: string
        CODIGO_PLAN: string
        TOKENS: number
        ESTADO: string
      }>
      DOCUMENTOS?: Array<{
        NOMBRE: string
        CONTENIDO: string
      }>
    }
    const IDENTIFICACION = String(raw.IDENTIFICACION)
    const { AFILIADO, PROFESION, ESPECIALIDAD, NOMBRE_PLAN, CORREO, TIPO, PLANES, DOCUMENTOS } = raw

    if (!IDENTIFICACION || !AFILIADO || !PLANES || !Array.isArray(PLANES)) {
      await supabaseAdmin.from('webhook_logs').insert({
        evento: 'REGISTRO',
        payload_raw: payload,
        status: 'ERROR',
        error_message: 'Missing required fields: IDENTIFICACION, AFILIADO, PLANES',
        ip_origen: ip,
      })
      return NextResponse.json(
        { error: 'Bad Request', detail: 'Missing required fields: IDENTIFICACION, AFILIADO, PLANES' },
        { status: 400 }
      )
    }

    // 5. Derivar wallet_address desde la cédula
    const walletAddress = getWalletAddress(IDENTIFICACION)

    // 6. Mapear documentos (hasta 4)
    const docs = DOCUMENTOS || []
    const docFields: Record<string, string | null> = {
      doc1_nombre: docs[0]?.NOMBRE || null,
      doc1_filekey: docs[0]?.CONTENIDO || null,
      doc2_nombre: docs[1]?.NOMBRE || null,
      doc2_filekey: docs[1]?.CONTENIDO || null,
      doc3_nombre: docs[2]?.NOMBRE || null,
      doc3_filekey: docs[2]?.CONTENIDO || null,
      doc4_nombre: docs[3]?.NOMBRE || null,
      doc4_filekey: docs[3]?.CONTENIDO || null,
    }

    // 7. Upsert usuario
    const { error: userError } = await supabaseAdmin.from('usuarios').upsert(
      {
        identificacion: IDENTIFICACION,
        afiliado: AFILIADO,
        profesion: PROFESION || null,
        especialidad: ESPECIALIDAD || null,
        nombre_plan: NOMBRE_PLAN || null,
        correo: CORREO || null,
        tipo: TIPO || null,
        wallet_address: walletAddress,
        wallet_creada: true,
        ...docFields,
      },
      { onConflict: 'identificacion' }
    )

    if (userError) {
      console.error('Error upserting usuario:', userError)
      await supabaseAdmin.from('webhook_logs').insert({
        evento: 'REGISTRO',
        payload_raw: payload,
        status: 'ERROR',
        error_message: `DB error: ${userError.message}`,
        ip_origen: ip,
      })
      return NextResponse.json(
        { error: 'Internal Server Error', detail: userError.message },
        { status: 500 }
      )
    }

    // 7. Insert de cada PLAN en planes_tokens
    for (const plan of PLANES) {
      const { error: planError } = await supabaseAdmin.from('planes_tokens').insert({
        identificacion: String(plan.IDENTIFICACION || IDENTIFICACION),
        codigo_plan: plan.CODIGO_PLAN,
        tokens: plan.TOKENS,
        estado: plan.ESTADO || 'DISPONIBLES',
        fecha_vinculacion: plan.FECHA_VINCULACION || null,
      })

      if (planError) {
        console.error('Error inserting plan:', planError)
      }
    }

    // 8. Log de éxito
    await supabaseAdmin.from('webhook_logs').insert({
      evento: 'REGISTRO',
      payload_raw: payload,
      status: 'SUCCESS',
      ip_origen: ip,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook registro error:', error)

    try {
      await supabaseAdmin.from('webhook_logs').insert({
        evento: 'REGISTRO',
        payload_raw: payload,
        status: 'ERROR',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch (logError) {
      console.error('Error logging webhook failure:', logError)
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
