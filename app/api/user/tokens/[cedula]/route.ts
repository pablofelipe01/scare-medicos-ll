import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { DashboardData, PlanToken } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { cedula: string } }
) {
  try {
    const { cedula } = params

    // Consultar usuario
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('identificacion', cedula)
      .single()

    if (userError || !usuario) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Consultar todos los planes del usuario
    const { data: planes, error: planesError } = await supabaseAdmin
      .from('planes_tokens')
      .select('*')
      .eq('identificacion', cedula)
      .order('fecha_vinculacion', { ascending: true })

    if (planesError) {
      console.error('Error fetching planes:', planesError)
    }

    const allPlanes: PlanToken[] = planes || []

    // Calcular totales
    const totalDisponibles = allPlanes
      .filter((p) => p.estado === 'DISPONIBLES')
      .reduce((sum, p) => sum + p.tokens, 0)

    const totalReservados = allPlanes
      .filter((p) => p.estado === 'RESERVADOS')
      .reduce((sum, p) => sum + p.tokens, 0)

    const totalUtilizados = allPlanes
      .filter((p) => p.estado === 'UTILIZADOS')
      .reduce((sum, p) => sum + p.tokens, 0)

    const dashboardData: DashboardData = {
      usuario,
      planes: allPlanes,
      totalDisponibles,
      totalReservados,
      totalUtilizados,
    }

    return NextResponse.json(dashboardData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error in GET /api/user/tokens/[cedula]:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
