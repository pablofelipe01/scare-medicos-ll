import { ethers } from 'ethers'

// Derivar wallet deterministicamente desde la cédula
export function deriveWalletFromCedula(cedula: string): ethers.HDNodeWallet {
  const masterNode = ethers.HDNodeWallet.fromPhrase(
    process.env.HD_MASTER_MNEMONIC!
  )
  // Convertir cédula a índice numérico estable
  const index = parseInt(cedula) % 2147483648 // max BIP32 index
  const derivedWallet = masterNode.deriveChild(index)
  return derivedWallet
}

// Obtener solo la dirección pública (seguro para exponer)
export function getWalletAddress(cedula: string): string {
  return deriveWalletFromCedula(cedula).address
}
