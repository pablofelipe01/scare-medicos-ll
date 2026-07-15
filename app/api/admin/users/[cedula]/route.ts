import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminSessionFromRequest, unauthorizedResponse } from '@/lib/auth'
import type { AdminUserDetail, PlanToken } from '@/types'

export const dynamic = 'force-dynamic'

// Campos NO sensibles que el administrador puede editar. Cualquier otro
// (wallet, tokens, hashes, flags de activación) se ignora deliberadamente.
const EDITABLE = ['afiliado', 'correo', 'profesion', 'especialidad', 'tipo', 'nombre_plan'] as const

const USER_FIELDS =
  'identificacion, afiliado, profesion, especialidad, nombre_plan, correo, tipo, wallet_address, wallet_creada, tokens_activados, fecha_creacion, fecha_activacion, avatar_url, certificado_descargado, codigo_hash, doc1_nombre, doc1_filekey, doc2_nombre, doc2_filekey, doc3_nombre, doc3_filekey, doc4_nombre, doc4_filekey'

async function fetchDetail(cedula: string): Promise<AdminUserDetail | null> {
  const { data: raw, error } = await supabaseAdmin
    .from('usuarios')
    .select(USER_FIELDS)
    .eq('identificacion', cedula)
    .single()
  if (error || !raw) return null

  const { codigo_hash, ...safe } = raw
  const { data: planes } = await supabaseAdmin
    .from('planes_tokens')
    .select('*')
    .eq('identificacion', cedula)
    .order('fecha_vinculacion', { ascending: true })

  return {
    ...(safe as Omit<AdminUserDetail, 'planes' | 'codigo_configurado'>),
    codigo_configurado: !!codigo_hash,
    planes: (planes || []) as PlanToken[],
  } as AdminUserDetail
}

export async function GET(request: NextRequest, { params }: { params: { cedula: string } }) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return unauthorizedResponse()

  try {
    const detail = await fetchDetail(params.cedula)
    if (!detail) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error GET /api/admin/users/[cedula]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { cedula: string } }) {
  const session = getAdminSessionFromRequest(request)
  if (!session) return unauthorizedResponse()

  try {
    const body = await request.json()
    const currentCedula = params.cedula

    const { data: existing } = await supabaseAdmin
      .from('usuarios')
      .select('identificacion')
      .eq('identificacion', currentCedula)
      .single()
    if (!existing) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // Construir el update SOLO con campos permitidos
    const update: Record<string, unknown> = {}

    for (const field of EDITABLE) {
      if (field in body) {
        let value = body[field]
        if (typeof value === 'string') value = value.trim()
        if (field === 'afiliado') {
          if (!value) return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
        }
        if (field === 'correo' && value) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })
          }
        }
        update[field] = value === '' ? null : value
      }
    }

    // Cambio de cédula (llave primaria) — se valida aparte
    let newCedula: string | null = null
    if ('identificacion' in body) {
      const candidate = String(body.identificacion).trim()
      if (candidate && candidate !== currentCedula) {
        if (!/^\d+$/.test(candidate)) {
          return NextResponse.json({ error: 'La cédula debe ser numérica' }, { status: 400 })
        }
        const { data: taken } = await supabaseAdmin
          .from('usuarios')
          .select('identificacion')
          .eq('identificacion', candidate)
          .single()
        if (taken) {
          return NextResponse.json({ error: 'Ya existe un usuario con esa cédula' }, { status: 409 })
        }
        newCedula = candidate
        update.identificacion = candidate // los planes se actualizan por ON UPDATE CASCADE
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 })
    }

    const { error: updErr } = await supabaseAdmin
      .from('usuarios')
      .update(update)
      .eq('identificacion', currentCedula)

    if (updErr) {
      console.error('Error actualizando usuario:', updErr)
      return NextResponse.json({ error: 'Error al guardar los cambios' }, { status: 500 })
    }

    const detail = await fetchDetail(newCedula || currentCedula)
    return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error PATCH /api/admin/users/[cedula]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
