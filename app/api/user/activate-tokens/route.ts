import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMinterContract } from '@/lib/contract'
import { getSessionFromRequest, unauthorizedResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return unauthorizedResponse()

    // Usar la cédula del JWT, no la del body
    const identificacion = session.cedula

    // 1. Consultar usuario → obtener wallet_address
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('wallet_address')
      .eq('identificacion', identificacion)
      .single()

    if (userError || !usuario?.wallet_address) {
      return NextResponse.json(
        { error: 'User not found or no wallet' },
        { status: 404 }
      )
    }

    // 2. Consultar planes pendientes de mint
    const { data: planes, error: planesError } = await supabaseAdmin
      .from('planes_tokens')
      .select('*')
      .eq('identificacion', identificacion)
      .eq('estado', 'DISPONIBLES')
      .is('fecha_mint', null)

    if (planesError) {
      console.error('Error fetching planes:', planesError)
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      )
    }

    // 3. Si no hay planes pendientes
    if (!planes || planes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay tokens pendientes',
      })
    }

    // 4. Obtener contrato con wallet minter
    const contract = getMinterContract()
    const txHashes: string[] = []

    // 5. Para cada plan, mintear tokens
    for (const plan of planes) {
      // Buscar o crear token_id en token_ids_map
      let tokenId: number

      const { data: existingMap } = await supabaseAdmin
        .from('token_ids_map')
        .select('token_id')
        .eq('codigo_plan', plan.codigo_plan)
        .single()

      if (existingMap) {
        tokenId = existingMap.token_id
      } else {
        // Obtener el mayor token_id actual y sumarle 1
        const { data: maxToken } = await supabaseAdmin
          .from('token_ids_map')
          .select('token_id')
          .order('token_id', { ascending: false })
          .limit(1)
          .single()

        tokenId = (maxToken?.token_id || 0) + 1

        await supabaseAdmin.from('token_ids_map').insert({
          codigo_plan: plan.codigo_plan,
          token_id: tokenId,
        })
      }

      // Ejecutar mint en el contrato ERC1155
      const tx = await contract.mintTo(
        usuario.wallet_address,
        tokenId,
        plan.tokens,
        '0x'
      )
      await tx.wait()

      // Actualizar plan en Supabase
      await supabaseAdmin
        .from('planes_tokens')
        .update({
          fecha_mint: new Date().toISOString(),
          tx_hash_mint: tx.hash,
          token_id_contrato: tokenId,
        })
        .eq('id', plan.id)

      txHashes.push(tx.hash)
    }

    // 6. Marcar tokens como activados
    await supabaseAdmin
      .from('usuarios')
      .update({
        tokens_activados: true,
        fecha_activacion: new Date().toISOString(),
      })
      .eq('identificacion', identificacion)

    return NextResponse.json({
      success: true,
      txHashes,
    })
  } catch (error) {
    console.error('Error activating tokens:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
