export type EstadoToken = 'DISPONIBLES' | 'RESERVADOS' | 'UTILIZADOS'

export interface Usuario {
  identificacion: string
  afiliado: string
  profesion: string | null
  especialidad: string | null
  nombre_plan: string | null
  correo: string | null
  tipo: string | null
  wallet_address: string | null
  wallet_creada: boolean
  tokens_activados: boolean
  fecha_creacion: string
  fecha_activacion: string | null
  avatar_url: string | null
  codigo_configurado: boolean
  doc1_nombre: string | null
  doc1_filekey: string | null
  doc2_nombre: string | null
  doc2_filekey: string | null
  doc3_nombre: string | null
  doc3_filekey: string | null
  doc4_nombre: string | null
  doc4_filekey: string | null
}

export interface PlanToken {
  id: string
  identificacion: string
  codigo_plan: string
  tokens: number
  estado: EstadoToken
  fecha_vinculacion: string | null
  fecha_mint: string | null
  tx_hash_mint: string | null
  tx_hash_burn: string | null
  token_id_contrato: number | null
}

export interface DashboardData {
  usuario: Usuario
  planes: PlanToken[]
  totalDisponibles: number
  totalReservados: number
  totalUtilizados: number
}

// ── Portal administrativo ──

export interface AdminUserListItem {
  identificacion: string
  afiliado: string
  correo: string | null
  tipo: string | null
  nombre_plan: string | null
  wallet_address: string | null
  wallet_creada: boolean
  tokens_activados: boolean
  certificado_descargado: string | null
  fecha_creacion: string
  planCodes: string[]
  tokensDisponibles: number
  tokensReservados: number
  tokensUtilizados: number
}

export interface AdminUsersResponse {
  users: AdminUserListItem[]
  total: number
  page: number
  pageSize: number
}

export interface AdminUserDetail extends Usuario {
  certificado_descargado: string | null
  planes: PlanToken[]
}

// Campos que el administrador puede editar (el resto es solo lectura)
export interface AdminEditableFields {
  identificacion?: string
  afiliado?: string
  correo?: string | null
  profesion?: string | null
  especialidad?: string | null
  tipo?: string | null
  nombre_plan?: string | null
}
