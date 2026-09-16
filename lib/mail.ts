// Remitente de los correos transaccionales (OTP / bienvenida).
//
// Se define por env var para poder mover el buzón sin desplegar codigo.
// El dominio del remitente debe estar verificado en Resend (DKIM + SPF del
// subdominio de envio), si no Resend rechaza el envio con 403.
//
// Valor de produccion esperado: 'FEVS <fevs@sylicon.co>'
// Fallback: el buzon de sylicon.tech, ya verificado.
export const MAIL_FROM = process.env.MAIL_FROM || 'TokBox <no-reply@sylicon.tech>'
