// @vitest-environment node
// Sprint 6: primer administrador sin cuentas de prueba, respaldos y bitácora con filtros.
import { mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { crearServidorDePrueba } from './ayudas-prueba.js'
import { abrirBase, administradorInicial, leerAjuste } from './db.js'
import { listarRespaldos, respaldar } from './respaldo.js'

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')
const ADMIN = {
  ROBAC_ADMIN_CORREO: 'jefa@coto.mx',
  ROBAC_ADMIN_CLAVE: 'clave-segura',
  ROBAC_ADMIN_NOMBRE: 'Laura Jefa',
}

let srv
const carpetas = []
afterEach(async () => {
  await srv?.cerrar()
  srv = null
  for (const c of carpetas.splice(0)) rmSync(c, { recursive: true, force: true })
})

function carpetaTemporal() {
  const c = mkdtempSync(join(tmpdir(), 'robac-s6-'))
  carpetas.push(c)
  return c
}

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

describe('HU22 · primer administrador sin cuentas de prueba', () => {
  it('lee el administrador de las variables de entorno y valida sus datos', () => {
    expect(administradorInicial({})).toBeNull()
    expect(administradorInicial(ADMIN)).toMatchObject({
      correo: 'jefa@coto.mx',
      nombre: 'Laura Jefa',
      rolId: 'admin',
    })
    expect(() => administradorInicial({ ...ADMIN, ROBAC_ADMIN_CORREO: 'jefa' })).toThrow(
      /correo válido/,
    )
    expect(() => administradorInicial({ ...ADMIN, ROBAC_ADMIN_CLAVE: 'corta' })).toThrow(
      /8 caracteres/,
    )
  })

  it('una base nueva con administrador no trae las cuentas de prueba', async () => {
    srv = await crearServidorDePrueba({ administrador: administradorInicial(ADMIN) })
    expect((await pedir('/salud')).datos).toEqual({ ok: true, cuentasPrueba: false })
    expect((await login('admin@robac.mx', 'admin123')).estado).toBe(401)

    const jefa = await login('jefa@coto.mx', 'clave-segura')
    expect(jefa.estado).toBe(200)
    expect(jefa.datos.rol.permisos).toContain('roles.gestionar')
    const usuarios = await pedir('/usuarios', { token: jefa.datos.token })
    expect(usuarios.datos.map((u) => u.correo)).toEqual(['jefa@coto.mx'])
  })

  it('sin administrador la base de demostración avisa que tiene cuentas de prueba', async () => {
    srv = await crearServidorDePrueba()
    expect((await pedir('/salud')).datos.cuentasPrueba).toBe(true)
  })

  it('una base creada antes del Sprint 6 se reconoce como de prueba', async () => {
    const ruta = join(carpetaTemporal(), 'vieja.db')
    const db = await abrirBase(ruta, { iteraciones: 1000 })
    db.exec('DELETE FROM ajustes')
    db.close()
    const reabierta = await abrirBase(ruta, { iteraciones: 1000 })
    expect(leerAjuste(reabierta, 'cuentas_prueba')).toBe('1')
    reabierta.close()
  })
})

describe('HU25 · respaldos de la base de datos', () => {
  it('el respaldo es una copia completa que se puede abrir', async () => {
    const carpeta = carpetaTemporal()
    const db = await abrirBase(':memory:', { iteraciones: 1000 })
    db.prepare(
      "INSERT INTO bitacora (fecha, actor, accion, detalle) VALUES (?, 'Sistema', 'Prueba', 'antes del respaldo')",
    ).run(new Date().toISOString())
    const ruta = respaldar(db, carpeta, { ahora: new Date(2026, 11, 1, 3, 0, 0) })
    db.close()

    expect(ruta).toMatch(/robac-20261201-030000\.db$/)
    const copia = new DatabaseSync(ruta)
    expect(copia.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n).toBe(4)
    expect(
      copia.prepare("SELECT detalle FROM bitacora WHERE accion = 'Prueba'").get().detalle,
    ).toBe('antes del respaldo')
    copia.close()
  })

  it('conserva solo los últimos 7 respaldos', async () => {
    const carpeta = carpetaTemporal()
    const db = await abrirBase(':memory:', { iteraciones: 1000 })
    for (let dia = 1; dia <= 9; dia += 1) respaldar(db, carpeta, { ahora: new Date(2026, 10, dia) })
    db.close()
    const quedan = listarRespaldos(carpeta)
    expect(quedan).toHaveLength(7)
    expect(quedan[0]).toBe('robac-20261103-000000.db')
    expect(quedan[6]).toBe('robac-20261109-000000.db')
  })
})
