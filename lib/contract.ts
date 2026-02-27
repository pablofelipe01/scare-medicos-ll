import { ethers } from 'ethers'
import SMT_ABI from './abi/SMT.json'

export function getMinterContract() {
  const provider = new ethers.JsonRpcProvider(
    `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  )
  const minterWallet = new ethers.Wallet(process.env.MINTER_PRIVATE_KEY!, provider)
  return new ethers.Contract(
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
    SMT_ABI,
    minterWallet
  )
}

export function getReadOnlyContract() {
  const provider = new ethers.JsonRpcProvider(
    `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  )
  return new ethers.Contract(
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
    SMT_ABI,
    provider
  )
}
