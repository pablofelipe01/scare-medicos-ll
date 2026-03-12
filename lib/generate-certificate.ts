import jsPDF from 'jspdf'
import type { Usuario } from '@/types'

interface CertificateData {
  usuario: Usuario
  codigoPlan: string
  disponibles: number
  reservados: number
  utilizados: number
}

function formatDateES(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function generateCertificate({
  usuario,
  codigoPlan,
  disponibles,
  reservados,
  utilizados,
}: CertificateData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentW = pageW - margin * 2

  // Background
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Border
  doc.setDrawColor(107, 92, 231) // #6B5CE7
  doc.setLineWidth(1.5)
  doc.rect(10, 10, pageW - 20, pageH - 20)

  // Inner border
  doc.setDrawColor(200, 200, 220)
  doc.setLineWidth(0.3)
  doc.rect(14, 14, pageW - 28, pageH - 28)

  // Header line
  doc.setDrawColor(107, 92, 231)
  doc.setLineWidth(0.8)
  doc.line(margin + 20, 45, pageW - margin - 20, 45)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(26, 26, 46) // #1A1A2E
  doc.text('CERTIFICADO DE TOKENIZACION', pageW / 2, 35, { align: 'center' })

  // Subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(107, 92, 231)
  doc.text('SYLICON — Sistema de Tokenizacion Medica', pageW / 2, 52, { align: 'center' })

  // Body text
  doc.setFontSize(11)
  doc.setTextColor(50, 50, 50)
  doc.setFont('helvetica', 'normal')

  const walletShort = usuario.wallet_address
    ? `${usuario.wallet_address.slice(0, 10)}...${usuario.wallet_address.slice(-8)}`
    : 'No asignada'

  const bodyText = `Certificamos que ${usuario.afiliado}, identificado(a) con cedula de ciudadania No. ${usuario.identificacion}, profesional en ${usuario.especialidad || usuario.profesion || 'Medicina'}, afiliado(a) desde el ${formatDateES(usuario.fecha_creacion)}, es titular de una billetera blockchain con direccion ${walletShort} en la red Polygon.`

  const bodyLines = doc.splitTextToSize(bodyText, contentW - 40)
  doc.text(bodyLines, pageW / 2, 66, { align: 'center', lineHeightFactor: 1.6 })

  // Token summary subtitle
  let y = 66 + bodyLines.length * 6 + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(26, 26, 46)
  doc.text(`Plan: ${codigoPlan}`, pageW / 2, y, { align: 'center' })
  y += 10

  // Token boxes
  const boxW = 65
  const boxH = 28
  const gap = 15
  const totalBoxW = boxW * 3 + gap * 2
  const startX = (pageW - totalBoxW) / 2

  const boxes = [
    { label: 'Tokens Disponibles', value: disponibles, color: [34, 197, 94] as [number, number, number] },
    { label: 'Tokens Reservados', value: reservados, color: [59, 130, 246] as [number, number, number] },
    { label: 'Tokens Utilizados', value: utilizados, color: [156, 163, 175] as [number, number, number] },
  ]

  boxes.forEach((box, i) => {
    const x = startX + i * (boxW + gap)

    // Box background
    doc.setFillColor(248, 248, 252)
    doc.roundedRect(x, y, boxW, boxH, 3, 3, 'F')

    // Box border
    doc.setDrawColor(box.color[0], box.color[1], box.color[2])
    doc.setLineWidth(0.6)
    doc.roundedRect(x, y, boxW, boxH, 3, 3, 'S')

    // Label
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(box.label.toUpperCase(), x + boxW / 2, y + 10, { align: 'center' })

    // Value
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(box.color[0], box.color[1], box.color[2])
    doc.text(`${box.value.toLocaleString()} SMT`, x + boxW / 2, y + 22, { align: 'center' })
  })

  y += boxH + 12

  // Disclaimer
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(130, 130, 130)
  doc.text(
    'Este certificado es generado de forma automatica y verificable a traves de la blockchain.',
    pageW / 2,
    y,
    { align: 'center' }
  )

  // Footer line
  doc.setDrawColor(107, 92, 231)
  doc.setLineWidth(0.5)
  doc.line(margin + 20, pageH - 30, pageW - margin - 20, pageH - 30)

  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Fecha de expedicion: ${formatDateES(new Date().toISOString())}`, margin + 25, pageH - 22)

  // Wallet full address in footer
  if (usuario.wallet_address) {
    doc.setFontSize(7)
    doc.setTextColor(130, 130, 130)
    doc.text(`Wallet: ${usuario.wallet_address}`, pageW - margin - 25, pageH - 22, { align: 'right' })
  }

  // Download
  const fileName = `Certificado_${usuario.identificacion}_${codigoPlan}.pdf`
  doc.save(fileName)
}
