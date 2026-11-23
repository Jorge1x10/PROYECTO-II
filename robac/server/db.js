// Base de datos SQLite (módulo node:sqlite, incluido en Node 22.13 o superior).
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { cifrar, ITERACIONES } from './auth.js'
import { PERMISOS, ROLES, USUARIOS } from './seed.js'

// Se carga con require porque las herramientas de empaquetado (Vite, Vitest) todavía no
// reconocen node:sqlite como módulo integrado de Node.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')

const ESQUEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roles (
  id     TEXT PRIMARY KEY,
  nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permisos (
  id     TEXT PRIMARY KEY,
  nombre TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rol_permisos (
  rol_id     TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id TEXT NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS usuarios (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  correo      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  sal         TEXT NOT NULL,
  hash        TEXT NOT NULL,
  iteraciones INTEGER NOT NULL,
  rol_id      TEXT NOT NULL REFERENCES roles(id),
  casa        TEXT NOT NULL DEFAULT '—',
  activo      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sesiones (
  huella     TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS visitas (
  id           TEXT PRIMARY KEY,
  visitante    TEXT NOT NULL,
  fecha        TEXT NOT NULL,
  residente_id TEXT NOT NULL REFERENCES usuarios(id),
  estado       TEXT NOT NULL DEFAULT 'autorizada'
);

CREATE TABLE IF NOT EXISTS bitacora (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha   TEXT NOT NULL,
  actor   TEXT NOT NULL,
  accion  TEXT NOT NULL,
  detalle TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recuperaciones (
  usuario_id TEXT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  huella     TEXT NOT NULL,
  creada     INTEGER NOT NULL,
  expira     INTEGER NOT NULL,
  intentos   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS intentos_login (
  correo          TEXT PRIMARY KEY,
  fallos          INTEGER NOT NULL DEFAULT 0,
  primer_fallo    INTEGER NOT NULL,
  bloqueado_hasta INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ajustes (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
`

// Lee el primer administrador de las variables de entorno. Si no se indica, la base nueva
// se llena con las cuentas de prueba (solo para desarrollo y demostración).
export function administradorInicial(env = process.env) {
  const correo = (env.ROBAC_ADMIN_CORREO ?? '').trim()
  const password = env.ROBAC_ADMIN_CLAVE ?? ''
  if (!correo && !password) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    throw new Error('ROBAC_ADMIN_CORREO no es un correo válido.')
  }
  if (password.length < 8) {
    throw new Error('ROBAC_ADMIN_CLAVE debe tener al menos 8 caracteres.')
  }
  return {
    id: 'admin-inicial',
    nombre: (env.ROBAC_ADMIN_NOMBRE ?? '').trim() || 'Administrador',
    correo,
    password,
    rolId: 'admin',
    casa: '—',
    activo: 1,
  }
}

async function sembrar(db, iteraciones, administrador) {
  const cuentas = administrador ? [administrador] : USUARIOS
  const permiso = db.prepare('INSERT INTO permisos (id, nombre) VALUES (?, ?)')
  const rol = db.prepare('INSERT INTO roles (id, nombre) VALUES (?, ?)')
  const concede = db.prepare('INSERT INTO rol_permisos (rol_id, permiso_id) VALUES (?, ?)')
  const usuario = db.prepare(
    `INSERT INTO usuarios (id, nombre, correo, sal, hash, iteraciones, rol_id, casa, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )

  // El cifrado es asíncrono, así que se calcula antes de abrir la transacción.
  const claves = await Promise.all(cuentas.map((u) => cifrar(u.password, iteraciones)))

  db.exec('BEGIN')
  try {
    for (const p of PERMISOS) permiso.run(p.id, p.nombre)
    for (const r of ROLES) {
      rol.run(r.id, r.nombre)
      for (const p of r.permisos) concede.run(r.id, p)
    }
    cuentas.forEach((u, i) => {
      const c = claves[i]
      usuario.run(u.id, u.nombre, u.correo, c.sal, c.hash, c.iteraciones, u.rolId, u.casa, u.activo)
    })
    guardarAjuste(db, 'cuentas_prueba', administrador ? '0' : '1')
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function guardarAjuste(db, clave, valor) {
  db.prepare('INSERT OR REPLACE INTO ajustes (clave, valor) VALUES (?, ?)').run(clave, valor)
}

export function leerAjuste(db, clave) {
  return db.prepare('SELECT valor FROM ajustes WHERE clave = ?').get(clave)?.valor ?? null
}

export async function abrirBase(
  ruta = ':memory:',
  { iteraciones = ITERACIONES, administrador = null } = {},
) {
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true })
  const db = new DatabaseSync(ruta)
  db.exec(ESQUEMA)
  const vacia = db.prepare('SELECT COUNT(*) AS n FROM roles').get().n === 0
  if (vacia) {
    await sembrar(db, iteraciones, administrador)
  } else if (leerAjuste(db, 'cuentas_prueba') === null) {
    // Bases creadas antes del Sprint 6: tienen cuentas de prueba si existe la de Ana.
    const demo = db.prepare("SELECT 1 FROM usuarios WHERE id = 'u1'").get()
    guardarAjuste(db, 'cuentas_prueba', demo ? '1' : '0')
  }
  return db
}
