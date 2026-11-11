// @vitest-environment node
// Sprint 5: límite de intentos fallidos al iniciar sesión y envío del código por correo.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import tls from 'node:tls'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { crearServidorDePrueba } from './ayudas-prueba.js'
import { configuracionSmtp, crearEnvioDeCodigo, enviarCorreo } from './correo.js'

const MINUTO = 60 * 1000
let srv

afterEach(async () => {
  await srv?.cerrar()
  srv = null
})

async function pedir(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const headers = {}
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const respuesta = await fetch(`${srv.url}/api${ruta}`, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  })
  return { estado: respuesta.status, datos: await respuesta.json().catch(() => null) }
}

const login = (correo, password) =>
  pedir('/login', { metodo: 'POST', cuerpo: { correo, password } })

async function fallar(correo, veces) {
  const estados = []
  for (let i = 0; i < veces; i++) estados.push((await login(correo, 'equivocada')).estado)
  return estados
}

describe('Límite de intentos fallidos de inicio de sesión', () => {
  beforeEach(async () => {
    srv = await crearServidorDePrueba()
  })

  it('al quinto fallo bloquea el correo aunque después se use la contraseña correcta', async () => {
    expect(await fallar('guardia@robac.mx', 5)).toEqual([401, 401, 401, 401, 429])
    const r = await login('guardia@robac.mx', 'guardia123')
    expect(r.estado).toBe(429)
    expect(r.datos.error).toMatch(/Demasiados intentos fallidos. Espera 15 minutos/)

    const admin = (await login('admin@robac.mx', 'admin123')).datos.token
    const bitacora = await pedir('/bitacora', { token: admin })
    expect(bitacora.datos[1]).toMatchObject({
      actor: 'Sistema',
      accion: 'Acceso bloqueado temporalmente',
      detalle: 'Gustavo Guardia: 5 intentos fallidos',
    })
  })

  it('el bloqueo dura 15 minutos y no afecta a otras cuentas', async () => {
    await fallar('guardia@robac.mx', 5)
    expect((await login('residente@robac.mx', 'residente123')).estado).toBe(200)
    srv.reloj.ahora += 14 * MINUTO
    expect((await login('GUARDIA@robac.mx', 'guardia123')).estado).toBe(429)
    srv.reloj.ahora += 1 * MINUTO
    expect((await login('guardia@robac.mx', 'guardia123')).estado).toBe(200)
  })

  it('un inicio de sesión correcto reinicia la cuenta de fallos', async () => {
    await fallar('guardia@robac.mx', 4)
    expect((await login('guardia@robac.mx', 'guardia123')).estado).toBe(200)
    expect(await fallar('guardia@robac.mx', 4)).toEqual([401, 401, 401, 401])
  })

  it('los fallos de hace más de 15 minutos ya no cuentan', async () => {
    await fallar('guardia@robac.mx', 4)
    srv.reloj.ahora += 16 * MINUTO
    expect(await fallar('guardia@robac.mx', 4)).toEqual([401, 401, 401, 401])
  })

  it('un correo inexistente se bloquea igual, para no revelar quién tiene cuenta', async () => {
    const inexistente = await fallar('nadie@robac.mx', 5)
    const existente = await fallar('guardia@robac.mx', 5)
    expect(inexistente).toEqual(existente)
    const a = await login('nadie@robac.mx', 'x')
    const b = await login('guardia@robac.mx', 'x')
    expect(a).toEqual(b)
  })

  it('recuperar la contraseña o que el administrador la restablezca quita el bloqueo', async () => {
    await fallar('guardia@robac.mx', 5)
    await pedir('/recuperacion/solicitar', {
      metodo: 'POST',
      cuerpo: { correo: 'guardia@robac.mx' },
    })
    const { codigo } = srv.codigos[0]
    await pedir('/recuperacion/confirmar', {
      metodo: 'POST',
      cuerpo: { correo: 'guardia@robac.mx', codigo, nueva: 'nueva-clave' },
    })
    expect((await login('guardia@robac.mx', 'nueva-clave')).estado).toBe(200)

    await fallar('residente@robac.mx', 5)
    const admin = (await login('admin@robac.mx', 'admin123')).datos.token
    await pedir('/usuarios/u3/restablecer', {
      metodo: 'POST',
      cuerpo: { password: 'temporal1' },
      token: admin,
    })
    expect((await login('residente@robac.mx', 'temporal1')).estado).toBe(200)
  })
})

describe('Publicación', () => {
  it('responde la verificación de salud sin sesión', async () => {
    srv = await crearServidorDePrueba()
    const r = await pedir('/salud')
    expect(r).toEqual({ estado: 200, datos: { ok: true } })
  })
})

// ---------- Servidor SMTP falso para las pruebas de correo ----------
function servidorSmtpFalso({ extensiones = ['SIZE 10240000'], rechazarDestino = false, tlsServidor } = {}) {
  const recibido = { comandos: [], mensaje: '' }
  const servidor = net.createServer((crudo) => {
    let socket = crudo
    let bufer = ''
    let enDatos = false
    const decir = (linea) => socket.write(`${linea}\r\n`)

    const responder = (linea) => {
      if (enDatos) {
        if (linea === '.') {
          enDatos = false
          return decir('250 aceptado')
        }
        recibido.mensaje += `${linea}\r\n`
        return undefined
      }
      recibido.comandos.push(linea)
      const verbo = linea.split(/[ :]/)[0].toUpperCase()
      if (verbo === 'EHLO') {
        const lista = [...extensiones]
        if (tlsServidor && !(socket instanceof tls.TLSSocket)) lista.push('STARTTLS')
        lista.push('HELP')
        return lista.forEach((e, i) => decir(`250${i === lista.length - 1 ? ' ' : '-'}${e}`))
      }
      if (verbo === 'STARTTLS') {
        decir('220 adelante')
        crudo.off('data', alRecibir)
        socket = new tls.TLSSocket(crudo, { isServer: true, ...tlsServidor })
        socket.setEncoding('utf8')
        socket.on('data', alRecibir)
        return undefined
      }
      if (verbo === 'AUTH') return decir('235 bienvenido')
      if (verbo === 'MAIL') return decir('250 ok')
      if (verbo === 'RCPT') return decir(rechazarDestino ? '550 no existe' : '250 ok')
      if (verbo === 'DATA') {
        enDatos = true
        return decir('354 adelante')
      }
      if (verbo === 'QUIT') {
        decir('221 adiós')
        return socket.end()
      }
      return decir('502 no implementado')
    }

    function alRecibir(trozo) {
      bufer += trozo
      let fin
      while ((fin = bufer.indexOf('\r\n')) >= 0) {
        const linea = bufer.slice(0, fin)
        bufer = bufer.slice(fin + 2)
        responder(linea)
      }
    }

    crudo.setEncoding('utf8')
    crudo.on('data', alRecibir)
    crudo.on('error', () => {})
    decir('220 smtp.falso ESMTP')
  })

  return new Promise((resolver) => {
    servidor.listen(0, '127.0.0.1', () =>
      resolver({
        puerto: servidor.address().port,
        recibido,
        cerrar: () => new Promise((r) => servidor.close(r)),
      }),
    )
  })
}

function decodificar(mensaje) {
  const [encabezados, cuerpo] = mensaje.split('\r\n\r\n')
  const asunto = /Subject: =\?UTF-8\?B\?(.+)\?=/.exec(encabezados)[1]
  return {
    encabezados,
    asunto: Buffer.from(asunto, 'base64').toString('utf8'),
    texto: Buffer.from(cuerpo.replace(/\r\n/g, ''), 'base64').toString('utf8'),
  }
}

const configuracion = (puerto, extra = {}) => ({
  host: '127.0.0.1',
  puerto,
  seguro: false,
  usuario: null,
  clave: null,
  remitente: 'avisos@robac.mx',
  nombre: 'prueba.robac',
  ...extra,
})

describe('Envío del código por correo (SMTP)', () => {
  let smtp
  afterEach(async () => {
    await smtp?.cerrar()
    smtp = null
  })

  it('sin SMTP_HOST el código se sigue escribiendo en la consola', () => {
    expect(configuracionSmtp({})).toBeNull()
    expect(crearEnvioDeCodigo({}).modo).toBe('consola')
    expect(crearEnvioDeCodigo({ SMTP_HOST: 'smtp.ejemplo.mx' }).modo).toBe('SMTP smtp.ejemplo.mx:587')
    expect(configuracionSmtp({ SMTP_HOST: 'smtp.ejemplo.mx', SMTP_SEGURO: 'true' })).toMatchObject({
      puerto: 465,
      seguro: true,
    })
  })

  it('la recuperación completa funciona con el código que llega por correo', async () => {
    smtp = await servidorSmtpFalso()
    const correo = crearEnvioDeCodigo({
      SMTP_HOST: '127.0.0.1',
      SMTP_PUERTO: String(smtp.puerto),
      SMTP_REMITENTE: 'avisos@robac.mx',
    })
    srv = await crearServidorDePrueba({ enviarCodigo: correo.enviar })

    const r = await pedir('/recuperacion/solicitar', {
      metodo: 'POST',
      cuerpo: { correo: 'residente@robac.mx' },
    })
    expect(r.estado).toBe(200)
    expect(smtp.recibido.comandos).toContain('MAIL FROM:<avisos@robac.mx>')
    expect(smtp.recibido.comandos).toContain('RCPT TO:<residente@robac.mx>')

    const { asunto, texto, encabezados } = decodificar(smtp.recibido.mensaje)
    expect(encabezados).toContain('To: <residente@robac.mx>')
    expect(asunto).toBe('Código para recuperar tu contraseña de ROBAC')
    const codigo = /es: (\d{6})/.exec(texto)[1]

    const ok = await pedir('/recuperacion/confirmar', {
      metodo: 'POST',
      cuerpo: { correo: 'residente@robac.mx', codigo, nueva: 'desde-correo' },
    })
    expect(ok.estado).toBe(200)
    expect((await login('residente@robac.mx', 'desde-correo')).estado).toBe(200)
  })

  it('si el servidor rechaza el destinatario, el envío falla con el motivo', async () => {
    smtp = await servidorSmtpFalso({ rechazarDestino: true })
    await expect(
      enviarCorreo(configuracion(smtp.puerto), { para: 'x@robac.mx', asunto: 'a', texto: 'b' }),
    ).rejects.toThrow(/550 no existe/)
  })

  it('no manda la contraseña del correo por una conexión sin cifrar', async () => {
    smtp = await servidorSmtpFalso()
    const config = configuracion(smtp.puerto, { usuario: 'avisos@robac.mx', clave: 'secreta' })
    await expect(
      enviarCorreo(config, { para: 'x@robac.mx', asunto: 'a', texto: 'b' }),
    ).rejects.toThrow(/STARTTLS/)
    expect(smtp.recibido.comandos.some((c) => c.startsWith('AUTH'))).toBe(false)
  })

  it('rechaza direcciones con saltos de línea', async () => {
    await expect(
      enviarCorreo(configuracion(1), { para: 'x@robac.mx\r\nBcc: otro@x.mx', asunto: 'a', texto: 'b' }),
    ).rejects.toThrow(/no válida/)
  })

  let certificado = null
  try {
    const carpeta = mkdtempSync(join(tmpdir(), 'robac-tls-'))
    execFileSync(
      'openssl',
      ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
        '-keyout', join(carpeta, 'llave.pem'), '-out', join(carpeta, 'cert.pem')],
      { stdio: 'ignore' },
    )
    certificado = {
      key: readFileSync(join(carpeta, 'llave.pem')),
      cert: readFileSync(join(carpeta, 'cert.pem')),
    }
    rmSync(carpeta, { recursive: true, force: true })
  } catch {
    // sin openssl no se puede crear el certificado de prueba
  }

  it.skipIf(!certificado)('con STARTTLS cifra la conexión antes de autenticarse', async () => {
    smtp = await servidorSmtpFalso({ tlsServidor: certificado })
    const config = configuracion(smtp.puerto, {
      usuario: 'avisos@robac.mx',
      clave: 'secreta',
      tls: { ca: certificado.cert, servername: 'localhost' },
    })
    await enviarCorreo(config, { para: 'x@robac.mx', asunto: 'Prueba', texto: 'Hola' })
    const comandos = smtp.recibido.comandos
    expect(comandos.indexOf('STARTTLS')).toBeLessThan(
      comandos.findIndex((c) => c.startsWith('AUTH')),
    )
    const credencial = comandos.find((c) => c.startsWith('AUTH PLAIN ')).slice(11)
    expect(Buffer.from(credencial, 'base64').toString()).toBe('\0avisos@robac.mx\0secreta')
    expect(decodificar(smtp.recibido.mensaje).texto).toBe('Hola')
  })
})
