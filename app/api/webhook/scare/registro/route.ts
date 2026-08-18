import { NextRequest, NextResponse } from 'next/server'
import { verifyScareJWTDetallado } from '@/lib/jwt'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getWalletAddress } from '@/lib/wallet'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  let payload: Record<string, unknown> = {}

  const registrarEnLog = (status: string, error_message?: string) =>
    supabaseAdmin.from('webhook_logs').insert({
      evento: 'REGISTRO',
      payload_raw: payload,
      status,
      error_message: error_message || null,
      ip_origen: ip,
    })

  try {
    // 1. Leer el body ANTES de validar nada. El log de llegada tiene que ser lo
    //    primero: si rechazamos la llamada por autenticación, este es el único
    //    rastro de que SCARE nos llamó.
    const bodyText = await request.text()
    let errorDeParseo: string | null = null
    try {
      payload = bodyText ? JSON.parse(bodyText) : {}
    } catch {
      errorDeParseo = 'El body no es JSON válido'
      payload = { _body_no_parseable: bodyText.slice(0, 2000) }
    }

    // 2. Registrar la llegada
    await registrarEnLog('PROCESSING')

    // 3. Verificar JWT HS256 — todo rechazo queda auditado como UNAUTHORIZED
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await registrarEnLog(
        'UNAUTHORIZED',
        authHeader
          ? 'El header Authorization no usa el esquema Bearer'
          : 'Falta el header Authorization'
      )
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice('Bearer '.length).trim()
    const verificacion = verifyScareJWTDetallado(token)
    if (!verificacion.valido) {
      await registrarEnLog('UNAUTHORIZED', verificacion.motivo)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 4. Ya autenticados, recién ahora reportamos un body ilegible
    if (errorDeParseo) {
      await registrarEnLog('ERROR', errorDeParseo)
      return NextResponse.json(
        { error: 'Bad Request', detail: errorDeParseo },
        { status: 400 }
      )
    }

    // 5. Validar campos requeridos (SCARE puede enviar números en vez de strings)
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
      await registrarEnLog('ERROR', 'Missing required fields: IDENTIFICACION, AFILIADO, PLANES')
      return NextResponse.json(
        { error: 'Bad Request', detail: 'Missing required fields: IDENTIFICACION, AFILIADO, PLANES' },
        { status: 400 }
      )
    }

    // 6. Derivar wallet_address desde la cédula
    const walletAddress = getWalletAddress(IDENTIFICACION)

    // 7. Mapear documentos (hasta 4)
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

    // 8. Upsert usuario
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
      await registrarEnLog('ERROR', `DB error: ${userError.message}`)
      return NextResponse.json(
        { error: 'Internal Server Error', detail: userError.message },
        { status: 500 }
      )
    }

    // 9. Insert de cada PLAN en planes_tokens
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

    // 10. Log de éxito
    await registrarEnLog('SUCCESS')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook registro error:', error)

    try {
      await registrarEnLog('ERROR', error instanceof Error ? error.message : 'Unknown error')
    } catch (logError) {
      console.error('Error logging webhook failure:', logError)
    }

    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
