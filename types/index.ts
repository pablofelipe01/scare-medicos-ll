export type EstadoToken = 'DISPONIBLES' | 'RESERVADOS' | 'UTILIZADOS'

export interface Usuario {
  identificacion: string
  afiliado: string
  profesion: string | null
  especialidad: string | null
  nombre_plan: string | null
  wallet_address: string | null
  wallet_creada: boolean
  tokens_activados: boolean
  fecha_creacion: string
  fecha_activacion: string | null
  codigo_configurado: boolean
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
