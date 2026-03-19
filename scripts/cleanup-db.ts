/**
 * Script de limpieza de base de datos
 *
 * Proceso:
 * 1. Obtener todos los usuarios con wallet de Supabase
 * 2. Enviar 0.2 POL de la billetera principal a cada wallet (para gas)
 * 3. Desde cada wallet, quemar todos sus tokens ERC1155
 * 4. Limpiar las tablas de la base de datos
 *
 * Uso: npx tsx scripts/cleanup-db.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { ethers } from 'ethers'
import { createClient } from '@supabase/supabase-js'
import SMT_ABI from '../lib/abi/SMT.json'

// --- Config ---
const PROVIDER_URL = `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
const MINTER_PK = process.env.MINTER_PRIVATE_KEY!
const HD_MNEMONIC = process.env.HD_MASTER_MNEMONIC!
const POL_AMOUNT = ethers.parseEther('0.2')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const provider = new ethers.JsonRpcProvider(PROVIDER_URL)
const minterWallet = new ethers.Wallet(MINTER_PK, provider)

function deriveWalletFromCedula(cedula: string): ethers.HDNodeWallet {
  const masterNode = ethers.HDNodeWallet.fromPhrase(HD_MNEMONIC)
  const index = parseInt(cedula) % 2147483648
  return masterNode.deriveChild(index)
}

// --- Paso 1: Obtener datos ---
async function fetchData() {
  console.log('\n=== PASO 1: Obteniendo datos de Supabase ===\n')

  const { data: usuarios, error: errUsuarios } = await supabase
    .from('usuarios')
    .select('identificacion, wallet_address, afiliado')

  if (errUsuarios) throw new Error(`Error obteniendo usuarios: ${errUsuarios.message}`)
  console.log(`Usuarios encontrados: ${usuarios?.length ?? 0}`)

  const { data: tokenIds, error: errTokens } = await supabase
    .from('token_ids_map')
    .select('codigo_plan, token_id')

  if (errTokens) throw new Error(`Error obteniendo token_ids_map: ${errTokens.message}`)
  console.log(`Token IDs registrados: ${tokenIds?.length ?? 0}`)

  // Todos los token_id únicos que existen en el contrato
  const allTokenIds = (tokenIds ?? []).map(t => t.token_id)

  return { usuarios: usuarios ?? [], allTokenIds }
}

// --- Paso 2: Enviar POL ---
async function sendPOL(usuarios: { identificacion: string; wallet_address: string; afiliado: string }[]) {
  console.log('\n=== PASO 2: Enviando 0.2 POL a cada billetera ===\n')

  const minterBalance = await provider.getBalance(minterWallet.address)
  const totalNeeded = POL_AMOUNT * BigInt(usuarios.length)
  console.log(`Balance minter: ${ethers.formatEther(minterBalance)} POL`)
  console.log(`Total necesario: ${ethers.formatEther(totalNeeded)} POL (${usuarios.length} x 0.2)`)

  if (minterBalance < totalNeeded) {
    throw new Error(`Balance insuficiente. Necesitas al menos ${ethers.formatEther(totalNeeded)} POL`)
  }

  for (let i = 0; i < usuarios.length; i++) {
    const u = usuarios[i]
    console.log(`[${i + 1}/${usuarios.length}] Enviando 0.2 POL a ${u.afiliado} (${u.wallet_address})...`)

    const tx = await minterWallet.sendTransaction({
      to: u.wallet_address,
      value: POL_AMOUNT,
    })
    const receipt = await tx.wait()
    console.log(`  ✓ TX: ${receipt?.hash}`)
  }

  console.log('\n✓ POL enviado a todas las billeteras.')
}

// --- Paso 3: Quemar tokens ---
async function burnTokens(
  usuarios: { identificacion: string; wallet_address: string; afiliado: string }[],
  allTokenIds: number[]
) {
  console.log('\n=== PASO 3: Quemando tokens de cada billetera ===\n')

  if (allTokenIds.length === 0) {
    console.log('No hay token IDs registrados. Nada que quemar.')
    return
  }

  const readContract = new ethers.Contract(CONTRACT_ADDRESS, SMT_ABI, provider)

  for (let i = 0; i < usuarios.length; i++) {
    const u = usuarios[i]
    console.log(`[${i + 1}/${usuarios.length}] Procesando ${u.afiliado} (${u.identificacion})...`)

    // Derivar wallet del usuario
    const userHDWallet = deriveWalletFromCedula(u.identificacion)
    const userWallet = new ethers.Wallet(userHDWallet.privateKey, provider)
    const userContract = new ethers.Contract(CONTRACT_ADDRESS, SMT_ABI, userWallet)

    // Revisar balance de cada token_id
    for (const tokenId of allTokenIds) {
      const balance: bigint = await readContract.balanceOf(u.wallet_address, tokenId)

      if (balance > 0n) {
        console.log(`  Quemando ${balance} tokens (ID: ${tokenId})...`)
        const tx = await userContract.burn(u.wallet_address, tokenId, balance)
        const receipt = await tx.wait()
        console.log(`  ✓ Burn TX: ${receipt?.hash}`)
      }
    }
  }

  console.log('\n✓ Todos los tokens quemados.')
}

// --- Paso 4: Limpiar base de datos ---
async function cleanDatabase() {
  console.log('\n=== PASO 4: Limpiando base de datos ===\n')

  // Orden: primero tablas con FK, luego las principales
  const tables = [
    { name: 'planes_tokens', label: 'Planes y tokens' },
    { name: 'webhook_logs', label: 'Logs de webhooks' },
    { name: 'token_ids_map', label: 'Mapeo de token IDs' },
    { name: 'usuarios', label: 'Usuarios' },
  ]

  for (const table of tables) {
    const { error, count } = await supabase
      .from(table.name)
      .delete()
      .neq('identificacion', '__never_match__') // workaround: delete requiere un filtro

    if (error) {
      // Para tablas sin columna 'identificacion', usar otro approach
      const { error: err2 } = await supabase
        .from(table.name)
        .delete()
        .gte('created_at', '1970-01-01')

      if (err2) {
        console.error(`  ✗ Error limpiando ${table.label}: ${err2.message}`)
        continue
      }
    }
    console.log(`  ✓ ${table.label} limpiada`)
  }

  console.log('\n✓ Base de datos limpia.')
}

// --- Main ---
async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   LIMPIEZA DE BASE DE DATOS - SYLICON   ║')
  console.log('╚══════════════════════════════════════════╝')

  try {
    // Paso 1
    const { usuarios, allTokenIds } = await fetchData()

    if (usuarios.length === 0) {
      console.log('\nNo hay usuarios en la base de datos. Nada que hacer.')
      return
    }

    // Paso 2: Enviar POL
    await sendPOL(usuarios)

    // Paso 3: Quemar tokens
    await burnTokens(usuarios, allTokenIds)

    // Paso 4: Limpiar DB
    await cleanDatabase()

    console.log('\n╔══════════════════════════════════════════╗')
    console.log('║         PROCESO COMPLETADO ✓             ║')
    console.log('╚══════════════════════════════════════════╝')
  } catch (error) {
    console.error('\n✗ Error:', error)
    process.exit(1)
  }
}

main()
