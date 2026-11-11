// Envío del código de recuperación por correo (SMTP).
// Está escrito con los módulos net y tls de Node para no agregar dependencias.
// Si no se configura SMTP_HOST, el código se sigue escribiendo en la consola del servidor.
import { randomUUID } from 'node:crypto'
import net from 'node:net'
import tls from 'node:tls'

const ESPERA_MS = 15_000
const SIN_SALTOS = /^[^\r\n]*$/

// Lee las respuestas del servidor SMTP. Una respuesta puede ocupar varias líneas
// ("250-..." sigue, "250 ..." termina) y llega en trozos que hay que juntar.
class Conversacion {
  constructor() {
    this.bufer = ''
    this.lineas = []
    this.listas = []
    this.pendiente = null
    this.error = null
    this.alRecibir = (trozo) => this.recibir(trozo)
    this.alFallar = (error) => this.fallar(error)
    this.alVencer = () => this.fallar(new Error('El servidor de correo no respondió a tiempo.'))
    this.alCerrar = () => this.fallar(new Error('El servidor de correo cerró la conexión.'))
  }

  adjuntar(socket) {
    if (this.socket) {
      this.socket.off('data', this.alRecibir)
      this.socket.off('error', this.alFallar)
      this.socket.off('timeout', this.alVencer)
      this.socket.off('close', this.alCerrar)
    }
    this.socket = socket
    socket.setEncoding('utf8')
    socket.setTimeout(ESPERA_MS)
    socket.on('data', this.alRecibir)
    socket.on('error', this.alFallar)
    socket.on('timeout', this.alVencer)
    socket.on('close', this.alCerrar)
  }

  recibir(trozo) {
    this.bufer += trozo
    let fin
    while ((fin = this.bufer.indexOf('\n')) >= 0) {
      const linea = this.bufer.slice(0, fin).replace(/\r$/, '')
      this.bufer = this.bufer.slice(fin + 1)
      this.lineas.push(linea.slice(4))
      if (/^\d{3}(?: |$)/.test(linea)) {
        this.listas.push({ codigo: Number(linea.slice(0, 3)), lineas: this.lineas })
        this.lineas = []
      }
    }
    this.entregar()
  }

  fallar(error) {
    this.error ??= error
    this.entregar()
  }

  entregar() {
    if (!this.pendiente) return
    const { resolver, rechazar } = this.pendiente
    if (this.listas.length) {
      this.pendiente = null
      resolver(this.listas.shift())
    } else if (this.error) {
      this.pendiente = null
      rechazar(this.error)
    }
  }

  respuesta() {
    return new Promise((resolver, rechazar) => {
      this.pendiente = { resolver, rechazar }
      this.entregar()
    })
  }

  async orden(comando, esperados, { mostrar = comando } = {}) {
    if (comando !== null) this.socket.write(`${comando}\r\n`)
    const r = await this.respuesta()
    if (!esperados.includes(r.codigo)) {
      throw new Error(
        `El servidor de correo rechazó «${mostrar ?? 'saludo'}»: ${r.codigo} ${r.lineas.join(' ')}`,
      )
    }
    return r
  }

  cerrar() {
    this.socket?.off('close', this.alCerrar)
    this.socket?.destroy()
  }
}

function conectar(config) {
  return new Promise((resolver, rechazar) => {
    const opciones = { host: config.host, port: config.puerto }
    const socket = config.seguro
      ? tls.connect({ ...opciones, servername: config.host, ...config.tls })
      : net.connect(opciones)
    socket.once(config.seguro ? 'secureConnect' : 'connect', () => resolver(socket))
    socket.once('error', rechazar)
  })
}

function subirATls(socket, config) {
  return new Promise((resolver, rechazar) => {
    const seguro = tls.connect({ socket, servername: config.host, ...config.tls })
    seguro.once('secureConnect', () => resolver(seguro))
    seguro.once('error', rechazar)
  })
}

const base64 = (texto) => Buffer.from(texto, 'utf8').toString('base64')

// El asunto lleva acentos, así que se codifica según el estándar de encabezados MIME.
const encabezadoUtf8 = (texto) => `=?UTF-8?B?${base64(texto)}?=`

export function armarMensaje({ de, para, asunto, texto, fecha = new Date() }) {
  const dominio = de.split('@')[1] ?? 'robac.local'
  const cuerpo = base64(texto).replace(/.{1,76}/g, '$&\r\n')
  return [
    `From: ROBAC <${de}>`,
    `To: <${para}>`,
    `Subject: ${encabezadoUtf8(asunto)}`,
    `Date: ${fecha.toUTCString()}`,
    `Message-ID: <${randomUUID()}@${dominio}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    cuerpo,
  ].join('\r\n')
}

export async function enviarCorreo(config, { para, asunto, texto }) {
  const de = config.remitente
  for (const valor of [de, para]) {
    if (!SIN_SALTOS.test(valor ?? '')) throw new Error('Dirección de correo no válida.')
  }

  const charla = new Conversacion()
  charla.adjuntar(await conectar(config))
  try {
    await charla.orden(null, [220])
    let saludo = await charla.orden(`EHLO ${config.nombre}`, [250])

    if (!config.seguro) {
      const ofreceTls = saludo.lineas.some((l) => /^STARTTLS\b/i.test(l))
      if (ofreceTls) {
        await charla.orden('STARTTLS', [220])
        charla.adjuntar(await subirATls(charla.socket, config))
        saludo = await charla.orden(`EHLO ${config.nombre}`, [250])
      } else if (config.usuario) {
        // Nunca se manda la contraseña del correo por una conexión sin cifrar.
        throw new Error('El servidor de correo no ofrece STARTTLS; no se envía la contraseña.')
      }
    }

    if (config.usuario) {
      const credencial = base64(`\0${config.usuario}\0${config.clave ?? ''}`)
      await charla.orden(`AUTH PLAIN ${credencial}`, [235], { mostrar: 'AUTH PLAIN' })
    }
    await charla.orden(`MAIL FROM:<${de}>`, [250])
    await charla.orden(`RCPT TO:<${para}>`, [250, 251])
    await charla.orden('DATA', [354])
    // El cuerpo va en base64, así que ninguna línea empieza con punto.
    await charla.orden(`${armarMensaje({ de, para, asunto, texto })}\r\n.`, [250], {
      mostrar: 'DATA',
    })
    await charla.orden('QUIT', [221]).catch(() => {})
  } finally {
    charla.cerrar()
  }
}

export function textoDelCodigo(codigo) {
  return [
    'Hola:',
    '',
    `Tu código para recuperar la contraseña de ROBAC es: ${codigo}`,
    '',
    'Vence en 15 minutos y solo se puede usar una vez.',
    'Si no lo pediste, ignora este correo: tu contraseña no ha cambiado.',
  ].join('\n')
}

export function configuracionSmtp(env = process.env) {
  if (!env.SMTP_HOST) return null
  const seguro = env.SMTP_SEGURO === 'true'
  return {
    host: env.SMTP_HOST,
    puerto: Number(env.SMTP_PUERTO ?? (seguro ? 465 : 587)),
    seguro,
    usuario: env.SMTP_USUARIO || null,
    clave: env.SMTP_CLAVE || null,
    remitente: env.SMTP_REMITENTE || env.SMTP_USUARIO || 'no-responder@robac.local',
    nombre: env.SMTP_NOMBRE || 'robac.local',
  }
}

export function envioPorConsola(correo, codigo) {
  console.log(`[ROBAC] Código de recuperación para ${correo}: ${codigo}`)
}

// Devuelve la función que usa la API para entregar el código.
export function crearEnvioDeCodigo(env = process.env) {
  const config = configuracionSmtp(env)
  if (!config) return { modo: 'consola', enviar: envioPorConsola }
  return {
    modo: `SMTP ${config.host}:${config.puerto}`,
    enviar: (correo, codigo) =>
      enviarCorreo(config, {
        para: correo,
        asunto: 'Código para recuperar tu contraseña de ROBAC',
        texto: textoDelCodigo(codigo),
      }),
  }
}
