// ============================================================
// WEBHOOK 3 — DEMANDA RESUELTA — BURN DE TOKENS
// Estado: COMENTADO — pendiente de definición con SCARE
// Cuando se active: quemar tokens RESERVADOS → UTILIZADOS
// Requiere transacción blockchain: burn(address, tokenId, amount)
// ============================================================

// import { NextRequest, NextResponse } from 'next/server'
// import { verifyScareJWT } from '@/lib/jwt'
// import { supabaseAdmin } from '@/lib/supabase-admin'
// import { getMinterContract } from '@/lib/contract'

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
//     // 3. Registrar en webhook_logs con evento: 'DEMANDA_RESUELTA'
//     const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
//     await supabaseAdmin.from('webhook_logs').insert({
//       evento: 'DEMANDA_RESUELTA',
//       payload_raw: payload,
//       status: 'PROCESSING',
//       ip_origen: ip,
//     })
//
//     // 4. Extraer los datos necesarios del payload
//     const { IDENTIFICACION, CODIGO_PLAN, TOKENS_A_QUEMAR } = payload
//
//     // 5. Validar campos requeridos
//     if (!IDENTIFICACION || !CODIGO_PLAN || !TOKENS_A_QUEMAR) {
//       return NextResponse.json(
//         { error: 'Bad Request', detail: 'Missing required fields' },
//         { status: 400 }
//       )
//     }
//
//     // 6. Obtener wallet_address del usuario desde Supabase
//     const { data: usuario, error: userError } = await supabaseAdmin
//       .from('usuarios')
//       .select('wallet_address')
//       .eq('identificacion', IDENTIFICACION)
//       .single()
//
//     if (userError || !usuario?.wallet_address) {
//       return NextResponse.json(
//         { error: 'User not found or no wallet' },
//         { status: 404 }
//       )
//     }
//
//     // 7. Obtener token_id desde token_ids_map
//     const { data: tokenMap, error: mapError } = await supabaseAdmin
//       .from('token_ids_map')
//       .select('token_id')
//       .eq('codigo_plan', CODIGO_PLAN)
//       .single()
//
//     if (mapError || !tokenMap) {
//       return NextResponse.json(
//         { error: 'Token ID mapping not found for plan' },
//         { status: 404 }
//       )
//     }
//
//     // 8. Instanciar el contrato ERC1155 con la wallet minter
//     const contract = getMinterContract()
//
//     // 9. Ejecutar burn en el contrato — quema tokens del usuario
//     //    burn(address account, uint256 id, uint256 amount)
//     const tx = await contract.burn(
//       usuario.wallet_address,
//       tokenMap.token_id,
//       TOKENS_A_QUEMAR
//     )
//
//     // 10. Esperar confirmación de la transacción en Polygon
//     await tx.wait()
//
//     // 11. Actualizar estado en planes_tokens a UTILIZADOS
//     const { error: updateError } = await supabaseAdmin
//       .from('planes_tokens')
//       .update({
//         estado: 'UTILIZADOS',
//         tx_hash_burn: tx.hash,
//       })
//       .eq('identificacion', IDENTIFICACION)
//       .eq('codigo_plan', CODIGO_PLAN)
//       .eq('estado', 'RESERVADOS')
//
//     if (updateError) {
//       console.error('Error updating plan after burn:', updateError)
//     }
//
//     // 12. Log de éxito
//     await supabaseAdmin.from('webhook_logs').insert({
//       evento: 'DEMANDA_RESUELTA',
//       payload_raw: payload,
//       status: 'SUCCESS',
//       ip_origen: ip,
//     })
//
//     // 13. Retornar éxito con hash de la transacción
//     return NextResponse.json({ success: true, txHash: tx.hash })
//   } catch (error) {
//     console.error('Webhook demanda-resuelta error:', error)
//     return NextResponse.json(
//       { error: 'Internal Server Error' },
//       { status: 500 }
//     )
//   }
// }

export {}
