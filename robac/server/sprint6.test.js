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

describe('HU27 · bitácora con filtros y páginas', () => {
  async function conMovimientos() {
    srv = await crearServidorDePrueba()
    const insertar = srv.db.prepare(
      'INSERT INTO bitacora (fecha, actor, accion, detalle) VALUES (?, ?, ?, ?)',
    )
    insertar.run('2026-11-01T15:00:00.000Z', 'Gustavo Guardia', 'Entrada registrada', 'Pedro Pérez')
    insertar.run(
      '2026-11-10T15:00:00.000Z',
      'Rosa Residente',
      'Visita autorizada',
      'Lucía 100% puntual',
    )
    insertar.run('2026-11-20T15:00:00.000Z', 'Gustavo Guardia', 'Salida registrada', 'Pedro Pérez')
    for (let i = 0; i < 120; i += 1)
      insertar.run('2026-11-25T15:00:00.000Z', 'Sistema', 'Prueba', `n${i}`)
    return (await login('guardia@robac.mx', 'guardia123')).datos.token
  }

  it('filtra por rango de fechas', async () => {
    const token = await conMovimientos()
    const r = await pedir(
      '/bitacora?desde=2026-11-05T00:00:00.000Z&hasta=2026-11-21T00:00:00.000Z',
      { token },
    )
    expect(r.datos.movimientos.map((m) => m.accion)).toEqual([
      'Salida registrada',
      'Visita autorizada',
    ])
    expect(r.datos.total).toBe(2)
  })

  it('busca en quién, acción y detalle, y toma % como texto', async () => {
    const token = await conMovimientos()
    const pedro = await pedir('/bitacora?buscar=pedro', { token })
    expect(pedro.datos.total).toBe(2)
    const porcentaje = await pedir(`/bitacora?buscar=${encodeURIComponent('100%')}`, { token })
    expect(porcentaje.datos.movimientos.map((m) => m.detalle)).toEqual(['Lucía 100% puntual'])
    expect((await pedir('/bitacora?buscar=%25', { token })).datos.total).toBe(1)
  })

  it('pagina de 50 en 50 y ajusta una página fuera de rango', async () => {
    const token = await conMovimientos()
    const tercera = await pedir('/bitacora?pagina=3', { token })
    // 3 + 120 + 1 inicio de sesión = 124 movimientos
    expect(tercera.datos).toMatchObject({ total: 124, pagina: 3, paginas: 3 })
    expect(tercera.datos.movimientos).toHaveLength(24)
    expect((await pedir('/bitacora?pagina=99', { token })).datos.pagina).toBe(3)
    expect((await pedir('/bitacora?pagina=abc', { token })).datos.pagina).toBe(1)
  })

  it('rechaza una fecha de filtro inválida', async () => {
    const token = await conMovimientos()
    const r = await pedir('/bitacora?desde=ayer', { token })
    expect(r.estado).toBe(400)
    expect(r.datos.error).toMatch(/fecha/)
  })
})
