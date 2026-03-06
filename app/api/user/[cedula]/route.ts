import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { cedula: string } }
) {
  try {
    const { cedula } = params

    // Buscar usuario por identificacion
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('identificacion, afiliado, profesion, especialidad, nombre_plan, wallet_address, wallet_creada, tokens_activados, fecha_creacion, fecha_activacion, codigo_hash')
      .eq('identificacion', cedula)
      .single()

    if (userError || !usuario) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Buscar planes del usuario
    const { data: planes, error: planesError } = await supabaseAdmin
      .from('planes_tokens')
      .select('*')
      .eq('identificacion', cedula)
      .order('fecha_vinculacion', { ascending: true })

    if (planesError) {
      console.error('Error fetching planes:', planesError)
    }

    // No exponer hashes al frontend
    const { codigo_hash, ...usuarioSafe } = usuario

    return NextResponse.json({
      usuario: {
        ...usuarioSafe,
        codigo_configurado: !!codigo_hash,
      },
      planes: planes || [],
    })
  } catch (error) {
    console.error('Error in GET /api/user/[cedula]:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
