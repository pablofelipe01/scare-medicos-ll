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
      .select('*')
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

    return NextResponse.json({
      usuario,
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
