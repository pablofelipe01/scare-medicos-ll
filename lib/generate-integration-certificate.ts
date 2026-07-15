import jsPDF from 'jspdf'

// Datos que devuelve el endpoint /api/certificadointegracion de la API Sylicon (SCARE)
export interface CertificadoIntegracion {
  AFILIADO: string
  IDENTIFICACION: number | string
  ESPECIALIDADES: string
  FECHA_INTEGRACION: string
  FECHA_CERTIFICADO: string
  FIRMA: string
  CARGO: string
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatFechaLarga(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`
}

function partesFecha(dateStr: string): { dia: string; mes: string; anio: string } {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { dia: '—', mes: '—', anio: '—' }
  return { dia: String(d.getDate()), mes: MESES[d.getMonth()], anio: String(d.getFullYear()) }
}

function formatMiles(id: number | string): string {
  const n = String(id).replace(/\D/g, '')
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Carga una imagen del /public y la devuelve como data URL para jsPDF.
async function loadImageDataURL(src: string): Promise<string> {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`No se pudo cargar la imagen ${src}`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function generateIntegrationCertificate(data: CertificadoIntegracion): Promise<void> {
  const [membrete, firma] = await Promise.all([
    // Membrete en JPEG: jsPDF lo embebe comprimido (el PNG RGBA se almacenaría sin comprimir → ~34 MB).
    loadImageDataURL('/certificado/membrete-fevs.jpg'),
    loadImageDataURL('/certificado/firma-veronica.png'),
  ])

  // Formato Carta (Letter) vertical, coincide con la proporción del membrete (2550x3300).
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()   // 215.9 mm
  const pageH = doc.internal.pageSize.getHeight()  // 279.4 mm

  // Membrete oficial FEVS como fondo de página completa
  doc.addImage(membrete, 'JPEG', 0, 0, pageW, pageH)

  const marginX = 28
  const contentW = pageW - marginX * 2
  const textColor: [number, number, number] = [40, 40, 40]
  const greenFEVS: [number, number, number] = [20, 71, 52] // verde institucional FEVS

  let y = 68

  // 1 pt = 25.4/72 mm. jsPDF maneja el tamaño de fuente en puntos aunque la unidad del doc sea mm.
  const PT_TO_MM = 25.4 / 72
  const LINE_FACTOR = 1.5

  const writeJustified = (
    text: string,
    fontStyle: 'normal' | 'bold' | 'italic',
    size: number,
    align: 'left' | 'center' | 'justify' = 'justify'
  ) => {
    doc.setFont('helvetica', fontStyle)
    doc.setFontSize(size)
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    const lineHeight = size * PT_TO_MM * LINE_FACTOR
    const lines: string[] = doc.splitTextToSize(text, contentW)
    if (align === 'center') {
      doc.text(lines, pageW / 2, y, { align: 'center', lineHeightFactor: LINE_FACTOR })
    } else {
      doc.text(lines, marginX, y, {
        align: align === 'justify' ? 'justify' : 'left',
        maxWidth: contentW,
        lineHeightFactor: LINE_FACTOR,
      })
    }
    y += lines.length * lineHeight
  }

  // Encabezado institucional
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(greenFEVS[0], greenFEVS[1], greenFEVS[2])
  doc.text('LA SOCIEDAD COLOMBIANA DE ANESTESIOLOGÍA Y', pageW / 2, y, { align: 'center' })
  y += 6
  doc.text('REANIMACIÓN – S.C.A.R.E.', pageW / 2, y, { align: 'center' })
  y += 9

  writeJustified(
    'En calidad de ejecutora del Esquema Solidario – FEVS, en virtud del Mandato Sin Representación conferido por el Afiliado Activo Solidario,',
    'normal',
    11,
    'center'
  )
  y += 6

  // CERTIFICA
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(greenFEVS[0], greenFEVS[1], greenFEVS[2])
  doc.text('CERTIFICA', pageW / 2, y, { align: 'center' })
  y += 12

  const especialidades = data.ESPECIALIDADES || 'N/A'
  const parrafo1 =
    `Que el/la doctor(a) ${data.AFILIADO}, identificado(a) con cédula de ciudadanía No. ${formatMiles(data.IDENTIFICACION)}, ` +
    `de profesión/ocupación ${especialidades}, se encuentra integrado(a), de manera libre, autónoma, voluntaria y consciente, ` +
    `al Esquema Solidario – FEVS (‘Fideicomiso Económico Voluntario Solidario’), mecanismo colectivo de autogestión solidaria ` +
    `orientado al eventual reconocimiento del Apoyo Económico Solidario Colectivo frente a eventos o contingencias derivadas del ` +
    `ejercicio de su profesión u ocupación, así como de las actividades prácticas y académicas propias de los programas de educación ` +
    `en salud, conforme a las condiciones previamente definidas en la Declaración de Principios y Reglas del Esquema Solidario - FEVS, ` +
    `en el Plan de Participación aplicable y en los demás documentos jurídicos que soportan el Esquema Solidario, desde el ` +
    `${formatFechaLarga(data.FECHA_INTEGRACION)}.`
  writeJustified(parrafo1, 'normal', 11)
  y += 6

  const parrafo2 =
    `Que, en virtud de su integración al Esquema Solidario – FEVS, el/la doctor(a) ${data.AFILIADO} realiza Aportes Voluntarios ` +
    `No Reembolsables con destino al Fideicomiso Económico Voluntario Solidario - FEVS, en los términos, montos, plazos y condiciones ` +
    `definidos en su Plan de Participación. Dichos aportes tienen destinación exclusivamente solidaria y buscan contribuir a la ` +
    `conformación, suficiencia y sostenibilidad de los recursos comunes destinados al cumplimiento de la finalidad solidaria del ` +
    `Esquema Solidario - FEVS.`
  writeJustified(parrafo2, 'normal', 11)
  y += 6

  const { dia, mes, anio } = partesFecha(data.FECHA_CERTIFICADO)
  writeJustified(
    `La presente certificación se expide a los ${dia} días del mes de ${mes} de ${anio}.`,
    'normal',
    11
  )
  y += 20

  // Firma
  const firmaW = 45
  const firmaH = (286 / 686) * firmaW // proporción real de la imagen de firma
  doc.addImage(firma, 'PNG', marginX, y - firmaH + 4, firmaW, firmaH)
  y += 6

  // Línea de firma
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.4)
  doc.line(marginX, y, marginX + 70, y)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(textColor[0], textColor[1], textColor[2])
  doc.text(data.FIRMA || '', marginX, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90, 90, 90)
  doc.text(data.CARGO || '', marginX, y)

  const fileName = `Certificado_Integracion_${String(data.IDENTIFICACION).replace(/\D/g, '')}.pdf`
  doc.save(fileName)
}
