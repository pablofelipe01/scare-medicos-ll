// ============================================================
// WEBHOOK 2 — DEMANDA EN PROCESO
// Estado: COMENTADO — pendiente de definición con SCARE
// Cuando se active: cambiar estado DISPONIBLES → RESERVADOS
// No hay transacción blockchain, solo actualización en Supabase
// ============================================================

// import { NextRequest, NextResponse } from 'next/server'
// import { verifyScareJWT } from '@/lib/jwt'
// import { supabaseAdmin } from '@/lib/supabase-admin'

// export async function POST(request: NextRequest) {
//   try {
//     // 1. Verificar JWT HS256 — valida que el request viene de SCARE
//     const authHeader = request.headers.get('authorization')
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }
//
//     const token = authHeader.split(' ')[1]
//     if (!verifyScareJWT(token)) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }
//
//     // 2. Parsear el body del webhook
//     const payload = await request.json()
//
//     // 3. Registrar en webhook_logs con evento: 'DEMANDA_INICIO'
//     const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
//     await supabaseAdmin.from('webhook_logs').insert({
//       evento: 'DEMANDA_INICIO',
//       payload_raw: payload,
//       status: 'PROCESSING',
//       ip_origen: ip,
//     })
//
//     // 4. Extraer los datos necesarios del payload
//     const { IDENTIFICACION, CODIGO_PLAN, TOKENS_A_RESERVAR } = payload
//
//     // 5. Validar campos requeridos
//     if (!IDENTIFICACION || !CODIGO_PLAN) {
//       return NextResponse.json(
//         { error: 'Bad Request', detail: 'Missing required fields' },
//         { status: 400 }
//       )
//     }
//
//     // 6. UPDATE planes_tokens SET estado = 'RESERVADOS'
//     //    WHERE identificacion = IDENTIFICACION AND codigo_plan = CODIGO_PLAN
//     //    AND estado = 'DISPONIBLES'
//     const { error: updateError } = await supabaseAdmin
//       .from('planes_tokens')
//       .update({ estado: 'RESERVADOS' })
//       .eq('identificacion', IDENTIFICACION)
//       .eq('codigo_plan', CODIGO_PLAN)
//       .eq('estado', 'DISPONIBLES')
//
//     if (updateError) {
//       console.error('Error updating plan estado:', updateError)
//       await supabaseAdmin.from('webhook_logs').insert({
//         evento: 'DEMANDA_INICIO',
//         payload_raw: payload,
//         status: 'ERROR',
//         error_message: updateError.message,
//         ip_origen: ip,
//       })
//       return NextResponse.json(
//         { error: 'Internal Server Error', detail: updateError.message },
//         { status: 500 }
//       )
//     }
//
//     // 7. Log de éxito
//     await supabaseAdmin.from('webhook_logs').insert({
//       evento: 'DEMANDA_INICIO',
//       payload_raw: payload,
//       status: 'SUCCESS',
//       ip_origen: ip,
//     })
//
//     // 8. Retornar éxito
//     return NextResponse.json({ success: true })
//   } catch (error) {
//     console.error('Webhook demanda-inicio error:', error)
//     return NextResponse.json(
//       { error: 'Internal Server Error' },
//       { status: 500 }
//     )
//   }
// }

export {}
