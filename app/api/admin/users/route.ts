import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminSessionFromRequest, unauthorizedResponse } from '@/lib/auth'
import type { AdminUserListItem, AdminUsersResponse, PlanToken } from '@/types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20
// Supabase limita cada select a 1000 filas; la exportación pagina en bloques
const EXPORT_BATCH = 1000
// Evitar URLs demasiado largas en el filtro .in() de planes
const PLANES_CHUNK = 200

const USUARIO_COLUMNS =
  'identificacion, afiliado, correo, tipo, nombre_plan, wallet_address, wallet_creada, tokens_activados, certificado_descargado, fecha_creacion'

type UsuarioRow = Omit<
  AdminUserListItem,
  'planCodes' | 'tokensDisponibles' | 'tokensReservados' | 'tokensUtilizados'
>

function buildQuery(search: string, withCount: boolean) {
  let query = supabaseAdmin
    .from('usuarios')
    .select(USUARIO_COLUMNS, withCount ? { count: 'exact' } : undefined)

  if (search) {
    query = query.or(
      `identificacion.ilike.%${search}%,afiliado.ilike.%${search}%,correo.ilike.%${search}%`
    )
  }

  return query.order('fecha_creacion', { ascending: false })
}

// Traer los planes de los usuarios dados y agregarlos por cédula
async function withPlanes(usuarios: UsuarioRow[]): Promise<AdminUserListItem[]> {
  const cedulas = usuarios.map((u) => u.identificacion)
  const planesPorCedula = new Map<string, PlanToken[]>()

  for (let i = 0; i < cedulas.length; i += PLANES_CHUNK) {
    const { data: planes, error } = await supabaseAdmin
      .from('planes_tokens')
      .select('*')
      .in('identificacion', cedulas.slice(i, i + PLANES_CHUNK))
    if (error) throw error
    for (const p of (planes || []) as PlanToken[]) {
      const arr = planesPorCedula.get(p.identificacion) || []
      arr.push(p)
      planesPorCedula.set(p.identificacion, arr)
    }
  }

  const sumBy = (arr: PlanToken[], estado: string) =>
    arr.filter((p) => p.estado === estado).reduce((s, p) => s + p.tokens, 0)

  return usuarios.map((u) => {
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
}

// Texto delimitado por tabulaciones (abre bien en Excel)
function toTxt(users: AdminUserListItem[]): string {
  const clean = (v: unknown) =>
    v === null || v === undefined ? '' : String(v).replace(/[\t\r\n]+/g, ' ')
  const siNo = (v: boolean | null | undefined) => (v ? 'SI' : 'NO')

  const header = [
    'Cedula',
    'Nombre',
    'Correo',
    'Tipo',
    'Nombre plan',
    'Planes',
    'Aportes disponibles',
    'Aportes reservados',
    'Aportes utilizados',
    'Billetera',
    'Billetera creada',
    'Aportes activados',
    'Certificado descargado',
    'Fecha creacion',
  ]

  const rows = users.map((u) =>
    [
      u.identificacion,
      u.afiliado,
      u.correo,
      u.tipo,
      u.nombre_plan,
      u.planCodes.join(', '),
      u.tokensDisponibles,
      u.tokensReservados,
      u.tokensUtilizados,
      u.wallet_address,
      siNo(u.wallet_creada),
      siNo(u.tokens_activados),
      u.certificado_descargado,
      u.fecha_creacion,
    ]
      .map(clean)
      .join('\t')
  )

  return [header.join('\t'), ...rows].join('\r\n') + '\r\n'
}

export async function GET(request: NextRequest) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return unauthorizedResponse()

  try {
    const sp = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1)
    const rawSearch = (sp.get('search') || '').trim()
    // Evitar romper el filtro .or() de PostgREST (comas / paréntesis)
    const search = rawSearch.replace(/[,()%]/g, '')

    if (sp.get('format') === 'txt') {
      const usuarios: UsuarioRow[] = []
      for (let from = 0; ; from += EXPORT_BATCH) {
        const { data, error } = await buildQuery(search, false).range(from, from + EXPORT_BATCH - 1)
        if (error) throw error
        usuarios.push(...((data || []) as UsuarioRow[]))
        if (!data || data.length < EXPORT_BATCH) break
      }

      const users = await withPlanes(usuarios)
      const fecha = new Date().toISOString().slice(0, 10)
      // BOM para que Excel/Notepad respeten tildes y ñ
      return new NextResponse('\uFEFF' + toTxt(users), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="usuarios-${fecha}.txt"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data: usuarios, count, error } = await buildQuery(search, true).range(from, to)

    if (error) {
      console.error('Error listando usuarios:', error)
      return NextResponse.json({ error: 'Error al listar usuarios' }, { status: 500 })
    }

    const users = await withPlanes((usuarios || []) as UsuarioRow[])

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
