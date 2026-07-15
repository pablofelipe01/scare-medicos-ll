import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminSessionFromRequest, unauthorizedResponse } from '@/lib/auth'
import type { AdminUserListItem, AdminUsersResponse, PlanToken } from '@/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return unauthorizedResponse()

  try {
    const sp = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)
    const rawSearch = (sp.get('search') || '').trim()
    // Evitar romper el filtro .or() de PostgREST (comas / paréntesis)
    const search = rawSearch.replace(/[,()%]/g, '')

    let query = supabaseAdmin
      .from('usuarios')
      .select(
        'identificacion, afiliado, correo, tipo, nombre_plan, wallet_address, wallet_creada, tokens_activados, certificado_descargado, fecha_creacion',
        { count: 'exact' }
      )

    if (search) {
      query = query.or(
        `identificacion.ilike.%${search}%,afiliado.ilike.%${search}%,correo.ilike.%${search}%`
      )
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data: usuarios, count, error } = await query
      .order('fecha_creacion', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error listando usuarios:', error)
      return NextResponse.json({ error: 'Error al listar usuarios' }, { status: 500 })
    }

    const cedulas = (usuarios || []).map((u) => u.identificacion)

    // Traer los planes de los usuarios de esta página y agregarlos por cédula
    const planesPorCedula = new Map<string, PlanToken[]>()
    if (cedulas.length > 0) {
      const { data: planes } = await supabaseAdmin
        .from('planes_tokens')
        .select('*')
        .in('identificacion', cedulas)
      for (const p of (planes || []) as PlanToken[]) {
        const arr = planesPorCedula.get(p.identificacion) || []
        arr.push(p)
        planesPorCedula.set(p.identificacion, arr)
      }
    }

    const sumBy = (arr: PlanToken[], estado: string) =>
      arr.filter((p) => p.estado === estado).reduce((s, p) => s + p.tokens, 0)

    const users: AdminUserListItem[] = (usuarios || []).map((u) => {
      const planes = planesPorCedula.get(u.identificacion) || []
      return {
        identificacion: u.identificacion,
        afiliado: u.afiliado,
        correo: u.correo,
        tipo: u.tipo,
        nombre_plan: u.nombre_plan,
        wallet_address: u.wallet_address,
        wallet_creada: u.wallet_creada,
        tokens_activados: u.tokens_activados,
        certificado_descargado: u.certificado_descargado,
        fecha_creacion: u.fecha_creacion,
        planCodes: Array.from(new Set(planes.map((p) => p.codigo_plan))),
        tokensDisponibles: sumBy(planes, 'DISPONIBLES'),
        tokensReservados: sumBy(planes, 'RESERVADOS'),
        tokensUtilizados: sumBy(planes, 'UTILIZADOS'),
      }
    })

    const response: AdminUsersResponse = {
      users,
      total: count ?? users.length,
      page,
      pageSize: PAGE_SIZE,
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error en GET /api/admin/users:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
