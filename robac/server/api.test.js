// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { crearServidorDePrueba } from './ayudas-prueba.js'

const MINUTO = 60 * 1000
let srv

beforeEach(async () => {
  srv = await crearServidorDePrueba()
})

afterEach(async () => {
  await srv.cerrar()
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

async function entrar(correo, password) {
  const r = await pedir('/login', { metodo: 'POST', cuerpo: { correo, password } })
  expect(r.estado).toBe(200)
  return r.datos.token
}

const entrarAdmin = () => entrar('admin@robac.mx', 'admin123')
const entrarGuardia = () => entrar('guardia@robac.mx', 'guardia123')
const entrarResidente = () => entrar('residente@robac.mx', 'residente123')

describe('Autenticación y sesiones', () => {
  it('el inicio de sesión devuelve token, rol y permisos', async () => {
    const r = await pedir('/login', {
      metodo: 'POST',
      cuerpo: { correo: 'ADMIN@robac.mx', password: 'admin123' },
    })
    expect(r.estado).toBe(200)
    expect(r.datos.token).toBeTruthy()
    expect(r.datos.usuario).toMatchObject({ nombre: 'Ana Administradora', rolId: 'admin' })
    expect(r.datos.rol.permisos).toContain('roles.gestionar')
    expect(r.datos.permisos.length).toBeGreaterThan(0)
    expect(JSON.stringify(r.datos)).not.toContain('hash')
  })

  it('rechaza credenciales incorrectas y cuentas desactivadas', async () => {
    const mala = await pedir('/login', {
      metodo: 'POST',
      cuerpo: { correo: 'admin@robac.mx', password: 'mala' },
    })
    expect(mala.estado).toBe(401)
    const desconocido = await pedir('/login', {
      metodo: 'POST',
      cuerpo: { correo: 'nadie@robac.mx', password: 'loquesea' },
    })
    expect(desconocido.estado).toBe(401)
    expect(desconocido.datos.error).toBe(mala.datos.error)

    const desactivada = await pedir('/login', {
      metodo: 'POST',
      cuerpo: { correo: 'mario@robac.mx', password: 'mario123' },
    })
    expect(desactivada.estado).toBe(403)
    expect(desactivada.datos.error).toMatch(/desactivada/)
  })

  it('las rutas protegidas exigen un token válido', async () => {
    expect((await pedir('/usuarios')).estado).toBe(401)
    expect((await pedir('/usuarios', { token: 'inventado' })).estado).toBe(401)
    expect((await pedir('/yo')).estado).toBe(401)
  })

  it('cerrar sesión invalida el token', async () => {
    const token = await entrarAdmin()
    expect((await pedir('/yo', { token })).estado).toBe(200)
    expect((await pedir('/logout', { metodo: 'POST', token })).estado).toBe(200)
    expect((await pedir('/yo', { token })).estado).toBe(401)
  })

  it('la sesión vence a las 8 horas', async () => {
    const token = await entrarAdmin()
    srv.reloj.ahora += 7 * 60 * MINUTO
    expect((await pedir('/yo', { token })).estado).toBe(200)
    srv.reloj.ahora += 2 * 60 * MINUTO
    expect((await pedir('/yo', { token })).estado).toBe(401)
  })

  it('las contraseñas y los tokens nunca se guardan en claro', async () => {
    const token = await entrarAdmin()
    const usuarios = srv.db.prepare('SELECT * FROM usuarios').all()
    for (const u of usuarios) {
      expect(u.sal).toBeTruthy()
      expect(u.hash).toBeTruthy()
      expect(u.iteraciones).toBeGreaterThan(0)
    }
    const volcado = JSON.stringify([
      usuarios,
      srv.db.prepare('SELECT * FROM sesiones').all(),
    ])
    for (const secreto of ['admin123', 'guardia123', 'residente123', 'mario123', token]) {
      expect(volcado).not.toContain(secreto)
    }
  })

  it('un cuerpo que no es JSON devuelve un error claro', async () => {
    const respuesta = await fetch(`${srv.url}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{no es json',
    })
    expect(respuesta.status).toBe(400)
  })
})

describe('Permisos por rol, validados en el servidor', () => {
  it('el residente no puede administrar usuarios, roles ni bitácora', async () => {
    const token = await entrarResidente()
    expect((await pedir('/usuarios', { token })).estado).toBe(403)
    expect(
      (
        await pedir('/usuarios', {
          metodo: 'POST',
          token,
          cuerpo: { nombre: 'X', correo: 'x@robac.mx', password: 'secreto1', rolId: 'admin' },
        })
      ).estado,
    ).toBe(403)
    expect((await pedir('/bitacora', { token })).estado).toBe(403)
    expect(
      (
        await pedir('/roles/residente/permisos/usuarios.gestionar', {
          metodo: 'PUT',
          token,
          cuerpo: { concedido: true },
        })
      ).estado,
    ).toBe(403)
  })

  it('el guardia registra visitas pero no administra usuarios', async () => {
    const token = await entrarGuardia()
    expect((await pedir('/visitas', { token })).estado).toBe(200)
    expect((await pedir('/bitacora', { token })).estado).toBe(200)
    expect((await pedir('/usuarios', { token })).estado).toBe(403)
    expect(
      (await pedir('/visitas', { metodo: 'POST', token, cuerpo: { visitante: 'X', fecha: '2026-11-01' } }))
        .estado,
    ).toBe(403)
  })

  it('retirar un permiso a un rol surte efecto de inmediato', async () => {
    const admin = await entrarAdmin()
    const guardia = await entrarGuardia()
    expect((await pedir('/bitacora', { token: guardia })).estado).toBe(200)

    const r = await pedir('/roles/guardia/permisos/bitacora.ver', {
      metodo: 'PUT',
      token: admin,
      cuerpo: { concedido: false },
    })
    expect(r.estado).toBe(200)
    expect(r.datos.permisos).not.toContain('bitacora.ver')
    expect((await pedir('/bitacora', { token: guardia })).estado).toBe(403)

    await pedir('/roles/guardia/permisos/bitacora.ver', {
      metodo: 'PUT',
      token: admin,
      cuerpo: { concedido: true },
    })
    expect((await pedir('/bitacora', { token: guardia })).estado).toBe(200)
  })

  it('el administrador no puede quitarse el permiso de gestionar roles', async () => {
    const admin = await entrarAdmin()
    const r = await pedir('/roles/admin/permisos/roles.gestionar', {
      metodo: 'PUT',
      token: admin,
      cuerpo: { concedido: false },
    })
    expect(r.estado).toBe(400)
    const roles = await pedir('/roles', { token: admin })
    expect(roles.datos.find((x) => x.id === 'admin').permisos).toContain('roles.gestionar')
  })

  it('valida que el rol y el permiso existan', async () => {
    const admin = await entrarAdmin()
    const cuerpo = { concedido: true }
    expect(
      (await pedir('/roles/inventado/permisos/bitacora.ver', { metodo: 'PUT', token: admin, cuerpo }))
        .estado,
    ).toBe(404)
    expect(
      (await pedir('/roles/guardia/permisos/inventado', { metodo: 'PUT', token: admin, cuerpo }))
        .estado,
    ).toBe(404)
  })
})

describe('Gestión de usuarios', () => {
  const nuevo = {
    nombre: 'Luis Nuevo',
    correo: 'luis@robac.mx',
    password: 'clave123',
    rolId: 'residente',
    casa: 'Casa 5',
  }

  it('crea un usuario que ya puede iniciar sesión', async () => {
    const admin = await entrarAdmin()
    const r = await pedir('/usuarios', { metodo: 'POST', token: admin, cuerpo: nuevo })
    expect(r.estado).toBe(201)
    expect(r.datos).toMatchObject({ nombre: 'Luis Nuevo', rolId: 'residente', activo: true })
    expect(r.datos.password).toBeUndefined()
    await entrar('luis@robac.mx', 'clave123')
  })

  it('rechaza correos repetidos y datos inválidos', async () => {
    const admin = await entrarAdmin()
    const crear = (cuerpo) => pedir('/usuarios', { metodo: 'POST', token: admin, cuerpo })
    expect((await crear({ ...nuevo, correo: 'RESIDENTE@robac.mx' })).estado).toBe(409)
    expect((await crear({ ...nuevo, password: '123' })).estado).toBe(400)
    expect((await crear({ ...nuevo, correo: 'no-es-correo' })).estado).toBe(400)
    expect((await crear({ ...nuevo, rolId: 'inventado' })).estado).toBe(400)
    expect((await crear({ ...nuevo, nombre: '   ' })).estado).toBe(400)
  })

  it('edita los datos y no deja repetir el correo de otra persona', async () => {
    const admin = await entrarAdmin()
    const ok = await pedir('/usuarios/u3', {
      metodo: 'PATCH',
      token: admin,
      cuerpo: { casa: 'Casa 99', nombre: 'Rosa R.' },
    })
    expect(ok.estado).toBe(200)
    expect(ok.datos).toMatchObject({ casa: 'Casa 99', nombre: 'Rosa R.' })

    const repetido = await pedir('/usuarios/u3', {
      metodo: 'PATCH',
      token: admin,
      cuerpo: { correo: 'admin@robac.mx' },
    })
    expect(repetido.estado).toBe(409)

    const conservaElPropio = await pedir('/usuarios/u3', {
      metodo: 'PATCH',
      token: admin,
      cuerpo: { correo: 'residente@robac.mx' },
    })
    expect(conservaElPropio.estado).toBe(200)

    expect((await pedir('/usuarios/inventado', { metodo: 'PATCH', token: admin, cuerpo: {} })).estado).toBe(404)
  })

  it('nadie puede cambiarse su propio rol ni desactivar su propia cuenta', async () => {
    const admin = await entrarAdmin()
    for (const cuerpo of [{ rolId: 'residente' }, { activo: false }]) {
      const r = await pedir('/usuarios/u1', { metodo: 'PATCH', token: admin, cuerpo })
      expect(r.estado).toBe(400)
    }
    const yo = await pedir('/yo', { token: admin })
    expect(yo.datos.usuario).toMatchObject({ rolId: 'admin', activo: true })
  })

  it('desactivar a alguien cierra sus sesiones', async () => {
    const admin = await entrarAdmin()
    const residente = await entrarResidente()
    expect((await pedir('/yo', { token: residente })).estado).toBe(200)

    const r = await pedir('/usuarios/u3', { metodo: 'PATCH', token: admin, cuerpo: { activo: false } })
    expect(r.datos.activo).toBe(false)
    expect((await pedir('/yo', { token: residente })).estado).toBe(401)
  })

  it('cambiar el rol de alguien cambia sus accesos', async () => {
    const admin = await entrarAdmin()
    const residente = await entrarResidente()
    expect((await pedir('/bitacora', { token: residente })).estado).toBe(403)
    await pedir('/usuarios/u3', { metodo: 'PATCH', token: admin, cuerpo: { rolId: 'guardia' } })
    expect((await pedir('/bitacora', { token: residente })).estado).toBe(200)
  })

  it('restablecer la contraseña cierra las sesiones y la nueva funciona', async () => {
    const admin = await entrarAdmin()
    const residente = await entrarResidente()
    const corta = await pedir('/usuarios/u3/restablecer', {
      metodo: 'POST',
      token: admin,
      cuerpo: { password: '123' },
    })
    expect(corta.estado).toBe(400)

    const r = await pedir('/usuarios/u3/restablecer', {
      metodo: 'POST',
      token: admin,
      cuerpo: { password: 'temporal1' },
    })
    expect(r.estado).toBe(200)
    expect((await pedir('/yo', { token: residente })).estado).toBe(401)
    await entrar('residente@robac.mx', 'temporal1')
    const vieja = await pedir('/login', {
      metodo: 'POST',
      cuerpo: { correo: 'residente@robac.mx', password: 'residente123' },
    })
    expect(vieja.estado).toBe(401)
  })
})

describe('Mi cuenta', () => {
  it('cambia la contraseña, conserva esta sesión y cierra las demás', async () => {
    const actual = await entrarResidente()
    const otroDispositivo = await entrarResidente()
    const cambiar = (cuerpo) =>
      pedir('/yo/password', { metodo: 'POST', token: actual, cuerpo })

    expect((await cambiar({ actual: 'equivocada', nueva: 'nueva-clave-1' })).estado).toBe(400)
    expect((await cambiar({ actual: 'residente123', nueva: '123' })).estado).toBe(400)
    expect((await cambiar({ actual: 'residente123', nueva: 'residente123' })).estado).toBe(400)
    expect((await cambiar({ actual: 'residente123', nueva: 'nueva-clave-1' })).estado).toBe(200)

    expect((await pedir('/yo', { token: actual })).estado).toBe(200)
    expect((await pedir('/yo', { token: otroDispositivo })).estado).toBe(401)
    await entrar('residente@robac.mx', 'nueva-clave-1')
    const vieja = await pedir('/login', {
      metodo: 'POST',
      cuerpo: { correo: 'residente@robac.mx', password: 'residente123' },
    })
    expect(vieja.estado).toBe(401)
  })
})

describe('Visitas', () => {
  const crearVisita = (token, visitante = 'Pedro Pérez') =>
    pedir('/visitas', { metodo: 'POST', token, cuerpo: { visitante, fecha: '2026-11-01' } })

  it('flujo completo: autorizar, entrada y salida', async () => {
    const residente = await entrarResidente()
    const guardia = await entrarGuardia()
    const creada = await crearVisita(residente)
    expect(creada.estado).toBe(201)
    const id = creada.datos.id

    const cambiar = (token, estado) =>
      pedir(`/visitas/${id}`, { metodo: 'PATCH', token, cuerpo: { estado } })

    expect((await cambiar(guardia, 'salio')).estado).toBe(409)
    expect((await cambiar(guardia, 'dentro')).estado).toBe(200)
    expect((await cambiar(guardia, 'dentro')).estado).toBe(409)
    expect((await cambiar(guardia, 'cancelada')).estado).toBe(409)
    expect((await cambiar(guardia, 'salio')).estado).toBe(200)

    const lista = await pedir('/visitas', { token: guardia })
    expect(lista.datos[0]).toMatchObject({
      visitante: 'Pedro Pérez',
      estado: 'salio',
      residente: 'Rosa Residente',
      casa: 'Casa 12',
    })
  })

  it('el residente solo ve y solo puede cancelar sus propias visitas', async () => {
    const rosa = await entrarResidente()
    const admin = await entrarAdmin()
    // Otra persona residente con su propia visita
    await pedir('/usuarios', {
      metodo: 'POST',
      token: admin,
      cuerpo: { nombre: 'Otro Vecino', correo: 'vecino@robac.mx', password: 'vecino123', rolId: 'residente', casa: 'Casa 3' },
    })
    const vecino = await entrar('vecino@robac.mx', 'vecino123')

    const deRosa = (await crearVisita(rosa, 'Visita de Rosa')).datos
    await crearVisita(vecino, 'Visita del vecino')

    const vistaRosa = await pedir('/visitas', { token: rosa })
    expect(vistaRosa.datos.map((v) => v.visitante)).toEqual(['Visita de Rosa'])

    const ajena = await pedir(`/visitas/${deRosa.id}`, {
      metodo: 'PATCH',
      token: vecino,
      cuerpo: { estado: 'cancelada' },
    })
    expect(ajena.estado).toBe(403)

    const propia = await pedir(`/visitas/${deRosa.id}`, {
      metodo: 'PATCH',
      token: rosa,
      cuerpo: { estado: 'cancelada' },
    })
    expect(propia.estado).toBe(200)

    const entrada = await pedir(`/visitas/${deRosa.id}`, {
      metodo: 'PATCH',
      token: rosa,
      cuerpo: { estado: 'dentro' },
    })
    expect(entrada.estado).toBe(403)
  })

  it('valida el nombre, la fecha y el estado', async () => {
    const residente = await entrarResidente()
    const crear = (cuerpo) => pedir('/visitas', { metodo: 'POST', token: residente, cuerpo })
    expect((await crear({ visitante: '', fecha: '2026-11-01' })).estado).toBe(400)
    expect((await crear({ visitante: 'X', fecha: 'mañana' })).estado).toBe(400)
    expect((await crear({ visitante: 'X', fecha: '2026-13-45' })).estado).toBe(400)

    const id = (await crearVisita(residente)).datos.id
    const estado = await pedir(`/visitas/${id}`, {
      metodo: 'PATCH',
      token: residente,
      cuerpo: { estado: 'inventado' },
    })
    expect(estado.estado).toBe(400)
    expect((await pedir('/visitas/no-existe', { metodo: 'PATCH', token: residente, cuerpo: { estado: 'cancelada' } })).estado).toBe(404)
  })
})

describe('Bitácora', () => {
  it('guarda quién hizo qué, con los más recientes primero', async () => {
    const admin = await entrarAdmin()
    await pedir('/usuarios', {
      metodo: 'POST',
      token: admin,
      cuerpo: { nombre: 'Luis Nuevo', correo: 'luis@robac.mx', password: 'clave123', rolId: 'residente' },
    })
    const r = await pedir('/bitacora', { token: admin })
    expect(r.estado).toBe(200)
    expect(r.datos[0]).toMatchObject({
      actor: 'Ana Administradora',
      accion: 'Usuario creado',
      detalle: 'Luis Nuevo (residente)',
    })
    expect(r.datos.map((b) => b.accion)).toContain('Inicio de sesión')
    expect(Date.parse(r.datos[0].fecha)).not.toBeNaN()
  })

  it('muestra como máximo los últimos 200 movimientos', async () => {
    const insertar = srv.db.prepare(
      'INSERT INTO bitacora (fecha, actor, accion, detalle) VALUES (?, ?, ?, ?)',
    )
    for (let i = 0; i < 250; i += 1) insertar.run(new Date().toISOString(), 'Sistema', 'Prueba', `n${i}`)
    const admin = await entrarAdmin()
    const r = await pedir('/bitacora', { token: admin })
    expect(r.datos).toHaveLength(200)
  })
})

describe('Recuperación de contraseña', () => {
  const solicitar = (correo) =>
    pedir('/recuperacion/solicitar', { metodo: 'POST', cuerpo: { correo } })
  const confirmar = (cuerpo) =>
    pedir('/recuperacion/confirmar', { metodo: 'POST', cuerpo })

  it('flujo completo: pedir código, confirmarlo y entrar con la nueva contraseña', async () => {
    const sesionAnterior = await entrarResidente()
    const r = await solicitar('residente@robac.mx')
    expect(r.estado).toBe(200)
    expect(srv.codigos).toHaveLength(1)
    const { correo, codigo } = srv.codigos[0]
    expect(correo).toBe('residente@robac.mx')
    expect(codigo).toMatch(/^\d{6}$/)

    const ok = await confirmar({ correo, codigo, nueva: 'recuperada1' })
    expect(ok.estado).toBe(200)
    expect((await pedir('/yo', { token: sesionAnterior })).estado).toBe(401)
    await entrar('residente@robac.mx', 'recuperada1')

    // El código solo sirve una vez
    const repetido = await confirmar({ correo, codigo, nueva: 'otra-clave-2' })
    expect(repetido.estado).toBe(400)
  })

  it('no revela si un correo está registrado', async () => {
    const existe = await solicitar('residente@robac.mx')
    const noExiste = await solicitar('nadie@robac.mx')
    const desactivada = await solicitar('mario@robac.mx')
    expect(noExiste.estado).toBe(200)
    expect(noExiste.datos).toEqual(existe.datos)
    expect(desactivada.datos).toEqual(existe.datos)
    expect(srv.codigos.map((c) => c.correo)).toEqual(['residente@robac.mx'])
  })

  it('el código vence a los 15 minutos', async () => {
    await solicitar('residente@robac.mx')
    const { codigo } = srv.codigos[0]
    srv.reloj.ahora += 16 * MINUTO
    const r = await confirmar({ correo: 'residente@robac.mx', codigo, nueva: 'recuperada1' })
    expect(r.estado).toBe(400)
    expect(r.datos.error).toMatch(/vencid|válido/)
  })

  it('tras 5 intentos fallidos el código se bloquea aunque después sea el correcto', async () => {
    await solicitar('residente@robac.mx')
    const { codigo } = srv.codigos[0]
    const incorrecto = codigo === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i += 1) {
      const r = await confirmar({ correo: 'residente@robac.mx', codigo: incorrecto, nueva: 'recuperada1' })
      expect(r.estado).toBe(400)
    }
    const r = await confirmar({ correo: 'residente@robac.mx', codigo, nueva: 'recuperada1' })
    expect(r.estado).toBe(400)
  })

  it('no reenvía otro código si se pidió hace menos de un minuto', async () => {
    await solicitar('residente@robac.mx')
    await solicitar('residente@robac.mx')
    expect(srv.codigos).toHaveLength(1)
    srv.reloj.ahora += 61 * 1000
    await solicitar('residente@robac.mx')
    expect(srv.codigos).toHaveLength(2)
    // El código nuevo reemplaza al anterior
    const [viejo, nuevo] = srv.codigos
    const conViejo = await confirmar({ correo: 'residente@robac.mx', codigo: viejo.codigo, nueva: 'recuperada1' })
    if (viejo.codigo !== nuevo.codigo) expect(conViejo.estado).toBe(400)
  })

  it('exige una contraseña nueva de al menos 6 caracteres', async () => {
    await solicitar('residente@robac.mx')
    const { codigo } = srv.codigos[0]
    const r = await confirmar({ correo: 'residente@robac.mx', codigo, nueva: '123' })
    expect(r.estado).toBe(400)
    // Un intento rechazado por contraseña corta no gasta el código
    const ok = await confirmar({ correo: 'residente@robac.mx', codigo, nueva: 'recuperada1' })
    expect(ok.estado).toBe(200)
  })
})

describe('Persistencia', () => {
  it('los datos siguen ahí después de reiniciar el servidor', async () => {
    const carpeta = mkdtempSync(join(tmpdir(), 'robac-'))
    const ruta = join(carpeta, 'datos', 'robac.db')
    try {
      const primero = await crearServidorDePrueba({ ruta })
      const login = await fetch(`${primero.url}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'admin@robac.mx', password: 'admin123' }),
      })
      const { token } = await login.json()
      await fetch(`${primero.url}/api/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre: 'Luis Nuevo',
          correo: 'luis@robac.mx',
          password: 'clave123',
          rolId: 'residente',
        }),
      })
      await primero.cerrar()

      const segundo = await crearServidorDePrueba({ ruta })
      const entrada = await fetch(`${segundo.url}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'luis@robac.mx', password: 'clave123' }),
      })
      expect(entrada.status).toBe(200)
      // No se vuelve a sembrar: sigue habiendo un solo administrador
      const total = segundo.db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE rol_id = 'admin'").get()
      expect(total.n).toBe(1)
      await segundo.cerrar()
    } finally {
      rmSync(carpeta, { recursive: true, force: true })
    }
  })
})
