import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getWalletAddress(cedula: string): string {
  const masterNode = ethers.HDNodeWallet.fromPhrase(process.env.HD_MASTER_MNEMONIC!)
  const index = parseInt(cedula) % 2147483648
  return masterNode.deriveChild(index).address
}

async function main() {
  const ID = '123456'
  const wallet = getWalletAddress(ID)

  const { error: userError } = await supabase.from('usuarios').upsert({
    identificacion: ID,
    afiliado: 'Pablo Acebedo',
    profesion: 'Médico',
    especialidad: 'Medicina General',
    nombre_plan: 'Plan Integral',
    correo: 'pablofelipe@me.com',
    tipo: 'ANTIGUO',
    wallet_address: wallet,
    wallet_creada: true,
    doc1_nombre: 'Contrato de Mandato',
    doc1_filekey: 'filekey-mandato-abc123',
    doc2_nombre: 'Autorización Tratamiento Datos FEVS',
    doc2_filekey: 'filekey-datos-def456',
    doc3_nombre: 'Solicitud Integración Apoyo Económico Solidario',
    doc3_filekey: 'filekey-integracion-ghi789',
    doc4_nombre: 'Contrato de Tokenización',
    doc4_filekey: 'filekey-tokenizacion-jkl012',
  }, { onConflict: 'identificacion' })

  if (userError) { console.error('Error:', userError.message); process.exit(1) }
  console.log('✓ Usuario creado — wallet:', wallet)

  const planes = [
    { identificacion: ID, codigo_plan: 'AESC', tokens: 615, estado: 'DISPONIBLES', fecha_vinculacion: '2025-06-01' },
    { identificacion: ID, codigo_plan: 'AXS', tokens: 384, estado: 'DISPONIBLES', fecha_vinculacion: '2025-03-15' },
  ]

  for (const p of planes) {
    const { error } = await supabase.from('planes_tokens').insert(p)
    if (error) console.error('Error plan:', error.message)
    else console.log('✓ Plan', p.codigo_plan, ':', p.tokens, 'tokens')
  }
}

main()
