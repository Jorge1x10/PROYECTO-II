// @vitest-environment node
// Sprint 6: primer administrador sin cuentas de prueba, respaldos y bitácora con filtros.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { crearServidorDePrueba } from './ayudas-prueba.js'
import { abrirBase, administradorInicial, leerAjuste } from './db.js'

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
