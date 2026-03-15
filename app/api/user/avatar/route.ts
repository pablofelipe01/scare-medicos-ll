import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSessionFromRequest, unauthorizedResponse } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request)
    if (!session) return unauthorizedResponse()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const identificacion = session.cedula

    if (!file) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 })
    }

    // Validar tamaño (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar 2MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const filePath = `${identificacion}.${ext}`

    // Subir a Supabase Storage (sobreescribe si existe)
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Error al subir imagen' }, { status: 500 })
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

    // Guardar URL en la tabla usuarios
    await supabaseAdmin
      .from('usuarios')
      .update({ avatar_url: avatarUrl })
      .eq('identificacion', identificacion)

    return NextResponse.json({ success: true, avatar_url: avatarUrl })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
