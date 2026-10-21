// API de ROBAC. Todas las reglas de permisos se validan aquí, en el servidor:
// ocultar un botón en React ayuda a la persona, pero no protege nada por sí solo.
import { timingSafeEqual } from 'node:crypto'
import express from 'express'
import {
  cifrar,
  huella,
  ITERACIONES,
  nuevoCodigo,
  nuevoToken,
  verificacionFalsa,
  verificar,
} from './auth.js'

const MIN_PASSWORD = 6
const SESION_MS = 8 * 60 * 60 * 1000
const CODIGO_MS = 15 * 60 * 1000
const REENVIO_MS = 60 * 1000
const MAX_INTENTOS = 5
const MAX_BITACORA_VISTA = 200
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/

class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje)
    this.estado = estado
  }
}

function falla(estado, mensaje) {
  throw new ErrorHttp(estado, mensaje)
}

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '')

function iguales(a, b) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// Sin servicio de correo todavía: el código se escribe en la consola del servidor.
function envioPorConsola(correo, codigo) {
  console.log(`[ROBAC] Código de recuperación para ${correo}: ${codigo}`)
}

export function crearApp({
  db,
  iteraciones = ITERACIONES,
  enviarCodigo = envioPorConsola,
  ahora = () => Date.now(),
  carpetaWeb = null,
}) {
  const app = express()
  app.disable('x-powered-by')

  // ---------- Consultas preparadas ----------
  const q = {
    usuarioPorId: db.prepare('SELECT * FROM usuarios WHERE id = ?'),
    usuarioPorCorreo: db.prepare('SELECT * FROM usuarios WHERE correo = ?'),
    usuarios: db.prepare('SELECT * FROM usuarios ORDER BY rowid'),
    insertarUsuario: db.prepare(
      `INSERT INTO usuarios (id, nombre, correo, sal, hash, iteraciones, rol_id, casa, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    ),
    actualizarUsuario: db.prepare(
      'UPDATE usuarios SET nombre = ?, correo = ?, casa = ?, rol_id = ?, activo = ? WHERE id = ?',
    ),
    actualizarClave: db.prepare(
      'UPDATE usuarios SET sal = ?, hash = ?, iteraciones = ? WHERE id = ?',
    ),
    rolPorId: db.prepare('SELECT * FROM roles WHERE id = ?'),
    roles: db.prepare(
      `SELECT r.id, r.nombre, (SELECT COUNT(*) FROM usuarios u WHERE u.rol_id = r.id) AS usuarios
       FROM roles r ORDER BY r.rowid`,
    ),
    permisoPorId: db.prepare('SELECT * FROM permisos WHERE id = ?'),
    catalogo: db.prepare('SELECT id, nombre FROM permisos ORDER BY rowid'),
    permisosDeRol: db.prepare(
      'SELECT permiso_id FROM rol_permisos WHERE rol_id = ? ORDER BY permiso_id',
    ),
    conceder: db.prepare('INSERT OR IGNORE INTO rol_permisos (rol_id, permiso_id) VALUES (?, ?)'),
    retirar: db.prepare('DELETE FROM rol_permisos WHERE rol_id = ? AND permiso_id = ?'),
    crearSesion: db.prepare('INSERT INTO sesiones (huella, usuario_id, expira) VALUES (?, ?, ?)'),
    sesionValida: db.prepare(
      `SELECT u.* FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.huella = ? AND s.expira > ? AND u.activo = 1`,
    ),
    borrarSesion: db.prepare('DELETE FROM sesiones WHERE huella = ?'),
    borrarSesionesDe: db.prepare('DELETE FROM sesiones WHERE usuario_id = ?'),
    borrarSesionesDeSalvo: db.prepare('DELETE FROM sesiones WHERE usuario_id = ? AND huella != ?'),
    borrarSesionesVencidas: db.prepare('DELETE FROM sesiones WHERE expira <= ?'),
    visitas: db.prepare(
      `SELECT v.id, v.visitante, v.fecha, v.estado, v.residente_id AS residenteId,
              u.nombre AS residente, u.casa
       FROM visitas v JOIN usuarios u ON u.id = v.residente_id
       ORDER BY v.rowid DESC`,
    ),
    visitasDe: db.prepare(
      `SELECT v.id, v.visitante, v.fecha, v.estado, v.residente_id AS residenteId,
              u.nombre AS residente, u.casa
       FROM visitas v JOIN usuarios u ON u.id = v.residente_id
       WHERE v.residente_id = ? ORDER BY v.rowid DESC`,
    ),
    visitaPorId: db.prepare('SELECT * FROM visitas WHERE id = ?'),
    insertarVisita: db.prepare(
      `INSERT INTO visitas (id, visitante, fecha, residente_id, estado)
       VALUES (?, ?, ?, ?, 'autorizada')`,
    ),
    estadoVisita: db.prepare('UPDATE visitas SET estado = ? WHERE id = ?'),
    bitacora: db.prepare(
      'SELECT id, fecha, actor, accion, detalle FROM bitacora ORDER BY id DESC LIMIT ?',
    ),
    anotar: db.prepare('INSERT INTO bitacora (fecha, actor, accion, detalle) VALUES (?, ?, ?, ?)'),
    recuperacionDe: db.prepare('SELECT * FROM recuperaciones WHERE usuario_id = ?'),
    guardarRecuperacion: db.prepare(
      `INSERT OR REPLACE INTO recuperaciones (usuario_id, huella, creada, expira, intentos)
       VALUES (?, ?, ?, ?, 0)`,
    ),
    sumarIntento: db.prepare(
      'UPDATE recuperaciones SET intentos = intentos + 1 WHERE usuario_id = ?',
    ),
    borrarRecuperacion: db.prepare('DELETE FROM recuperaciones WHERE usuario_id = ?'),
  }

  // ---------- Funciones de ayuda ----------
  const anotar = (actor, accion, detalle) =>
    q.anotar.run(new Date(ahora()).toISOString(), actor, accion, detalle)

  const permisosDeRol = (rolId) => q.permisosDeRol.all(rolId).map((f) => f.permiso_id)

  const publico = (u) => ({
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    casa: u.casa,
    rolId: u.rol_id,
    activo: u.activo === 1,
  })

  const perfil = (u) => {
    const rol = q.rolPorId.get(u.rol_id)
    return {
      usuario: publico(u),
      rol: { id: rol.id, nombre: rol.nombre, permisos: permisosDeRol(rol.id) },
      permisos: q.catalogo.all(),
    }
  }

  const rolConPermisos = (rolId) => {
    const fila = q.roles.all().find((r) => r.id === rolId)
    return { ...fila, permisos: permisosDeRol(rolId) }
  }

  function validarPassword(valor, mensaje) {
    const password = typeof valor === 'string' ? valor : ''
    if (password.length < MIN_PASSWORD) {
      falla(400, mensaje ?? `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
    }
    return password
  }

  async function guardarClave(usuarioId, password) {
    const clave = await cifrar(password, iteraciones)
    q.actualizarClave.run(clave.sal, clave.hash, clave.iteraciones, usuarioId)
  }

  // ---------- Middleware ----------
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    res.set('X-Content-Type-Options', 'nosniff')
    next()
  })
  app.use(express.json({ limit: '10kb' }))

  function autenticar(req, res, next) {
    const encabezado = /^Bearer (.+)$/.exec(req.get('authorization') ?? '')
    if (!encabezado) return next(new ErrorHttp(401, 'Inicia sesión para continuar.'))
    const h = huella(encabezado[1])
    const usuario = q.sesionValida.get(h, ahora())
    if (!usuario) return next(new ErrorHttp(401, 'Tu sesión venció. Inicia sesión de nuevo.'))
    req.usuario = usuario
    req.huella = h
    req.permisos = permisosDeRol(usuario.rol_id)
    return next()
  }

  // Basta con tener uno de los permisos indicados.
  const exigir =
    (...necesarios) =>
    (req, res, next) =>
      necesarios.some((p) => req.permisos.includes(p))
        ? next()
        : next(new ErrorHttp(403, 'No tienes permiso para hacer esto.'))

  // ---------- Sesión ----------
  app.post('/api/login', async (req, res) => {
    const correo = texto(req.body?.correo)
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const usuario = q.usuarioPorCorreo.get(correo)
    const valido = usuario
      ? await verificar(password, usuario)
      : await verificacionFalsa(password, iteraciones)
    if (!valido) falla(401, 'Correo o contraseña incorrectos.')
    if (usuario.activo !== 1) {
      falla(403, 'Tu cuenta está desactivada. Contacta al administrador.')
    }
    q.borrarSesionesVencidas.run(ahora())
    const token = nuevoToken()
    q.crearSesion.run(huella(token), usuario.id, ahora() + SESION_MS)
    anotar(usuario.nombre, 'Inicio de sesión', 'Acceso al sistema')
    res.json({ token, ...perfil(usuario) })
  })

  app.post('/api/logout', autenticar, (req, res) => {
    q.borrarSesion.run(req.huella)
    anotar(req.usuario.nombre, 'Cierre de sesión', 'Salida del sistema')
    res.json({ ok: true })
  })

  app.get('/api/yo', autenticar, (req, res) => {
    res.json(perfil(req.usuario))
  })

  app.post('/api/yo/password', autenticar, async (req, res) => {
    const actual = typeof req.body?.actual === 'string' ? req.body.actual : ''
    const nueva = validarPassword(
      req.body?.nueva,
      `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
    )
    if (!(await verificar(actual, req.usuario))) {
      falla(400, 'La contraseña actual no es correcta.')
    }
    if (nueva === actual) {
      falla(400, 'La nueva contraseña debe ser distinta de la actual.')
    }
    await guardarClave(req.usuario.id, nueva)
    // Cualquier otro dispositivo con sesión abierta tiene que volver a entrar.
    q.borrarSesionesDeSalvo.run(req.usuario.id, req.huella)
    anotar(req.usuario.nombre, 'Contraseña cambiada', req.usuario.nombre)
    res.json({ ok: true })
  })

  // ---------- Usuarios ----------
  app.get('/api/usuarios', autenticar, exigir('usuarios.ver'), (req, res) => {
    res.json(q.usuarios.all().map(publico))
  })

  app.post('/api/usuarios', autenticar, exigir('usuarios.gestionar'), async (req, res) => {
    const nombre = texto(req.body?.nombre)
    const correo = texto(req.body?.correo)
    const rolId = texto(req.body?.rolId)
    const casa = texto(req.body?.casa) || '—'
    if (!nombre) falla(400, 'El nombre no puede estar vacío.')
    if (!CORREO_VALIDO.test(correo)) falla(400, 'Escribe un correo válido.')
    const password = validarPassword(req.body?.password)
    if (!q.rolPorId.get(rolId)) falla(400, 'El rol no existe.')
    if (q.usuarioPorCorreo.get(correo)) falla(409, 'Ya existe un usuario con ese correo.')

    const id = crypto.randomUUID()
    const clave = await cifrar(password, iteraciones)
    q.insertarUsuario.run(id, nombre, correo, clave.sal, clave.hash, clave.iteraciones, rolId, casa)
    anotar(req.usuario.nombre, 'Usuario creado', `${nombre} (${rolId})`)
    res.status(201).json(publico(q.usuarioPorId.get(id)))
  })

  app.patch('/api/usuarios/:id', autenticar, exigir('usuarios.gestionar'), (req, res) => {
    const objetivo = q.usuarioPorId.get(req.params.id) ?? falla(404, 'El usuario no existe.')
    const cuerpo = req.body ?? {}
    const nuevo = {
      nombre: objetivo.nombre,
      correo: objetivo.correo,
      casa: objetivo.casa,
      rol_id: objetivo.rol_id,
      activo: objetivo.activo,
    }

    if (cuerpo.nombre !== undefined) {
      nuevo.nombre = texto(cuerpo.nombre)
      if (!nuevo.nombre) falla(400, 'El nombre no puede estar vacío.')
    }
    if (cuerpo.correo !== undefined) {
      nuevo.correo = texto(cuerpo.correo)
      if (!CORREO_VALIDO.test(nuevo.correo)) falla(400, 'Escribe un correo válido.')
    }
    if (cuerpo.casa !== undefined) nuevo.casa = texto(cuerpo.casa) || '—'
    if (cuerpo.rolId !== undefined) {
      nuevo.rol_id = texto(cuerpo.rolId)
      if (!q.rolPorId.get(nuevo.rol_id)) falla(400, 'El rol no existe.')
    }
    if (cuerpo.activo !== undefined) nuevo.activo = cuerpo.activo ? 1 : 0

    const cambiaRol = nuevo.rol_id !== objetivo.rol_id
    const cambiaActivo = nuevo.activo !== objetivo.activo
    if (objetivo.id === req.usuario.id && (cambiaRol || cambiaActivo)) {
      falla(400, 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta.')
    }
    const otro = q.usuarioPorCorreo.get(nuevo.correo)
    if (otro && otro.id !== objetivo.id) falla(409, 'Ya existe un usuario con ese correo.')

    q.actualizarUsuario.run(
      nuevo.nombre,
      nuevo.correo,
      nuevo.casa,
      nuevo.rol_id,
      nuevo.activo,
      objetivo.id,
    )

    const actor = req.usuario.nombre
    if (
      nuevo.nombre !== objetivo.nombre ||
      nuevo.correo !== objetivo.correo ||
      nuevo.casa !== objetivo.casa
    ) {
      anotar(actor, 'Datos de usuario editados', objetivo.nombre)
    }
    if (cambiaRol) {
      anotar(actor, 'Rol cambiado', `${nuevo.nombre}: ${objetivo.rol_id} → ${nuevo.rol_id}`)
    }
    if (cambiaActivo) {
      anotar(actor, nuevo.activo ? 'Usuario activado' : 'Usuario desactivado', nuevo.nombre)
      if (!nuevo.activo) q.borrarSesionesDe.run(objetivo.id)
    }
    res.json(publico(q.usuarioPorId.get(objetivo.id)))
  })

  // El administrador asigna una contraseña temporal a quien la olvidó.
  app.post(
    '/api/usuarios/:id/restablecer',
    autenticar,
    exigir('usuarios.gestionar'),
    async (req, res) => {
      const objetivo = q.usuarioPorId.get(req.params.id) ?? falla(404, 'El usuario no existe.')
      const password = validarPassword(req.body?.password)
      await guardarClave(objetivo.id, password)
      q.borrarSesionesDe.run(objetivo.id)
      anotar(req.usuario.nombre, 'Contraseña restablecida', objetivo.nombre)
      res.json({ ok: true })
    },
  )

  // ---------- Roles y permisos ----------
  app.get('/api/roles', autenticar, exigir('usuarios.ver', 'roles.gestionar'), (req, res) => {
    res.json(q.roles.all().map((r) => ({ ...r, permisos: permisosDeRol(r.id) })))
  })

  app.put(
    '/api/roles/:rolId/permisos/:permisoId',
    autenticar,
    exigir('roles.gestionar'),
    (req, res) => {
      const rol = q.rolPorId.get(req.params.rolId) ?? falla(404, 'El rol no existe.')
      const permiso = q.permisoPorId.get(req.params.permisoId) ?? falla(404, 'El permiso no existe.')
      if (typeof req.body?.concedido !== 'boolean') {
        falla(400, 'Indica si el permiso se concede o se retira.')
      }
      const concedido = req.body.concedido
      // El administrador siempre conserva este permiso para no quedarse sin acceso.
      if (rol.id === 'admin' && permiso.id === 'roles.gestionar' && !concedido) {
        falla(400, 'El administrador no puede perder el permiso de gestionar roles.')
      }
      const tenia = permisosDeRol(rol.id).includes(permiso.id)
      if (tenia !== concedido) {
        if (concedido) q.conceder.run(rol.id, permiso.id)
        else q.retirar.run(rol.id, permiso.id)
        anotar(
          req.usuario.nombre,
          concedido ? 'Permiso concedido' : 'Permiso retirado',
          `${permiso.id} → ${rol.nombre}`,
        )
      }
      res.json(rolConPermisos(rol.id))
    },
  )

  // ---------- Visitas ----------
  app.get(
    '/api/visitas',
    autenticar,
    exigir('visitas.autorizar', 'visitas.registrar'),
    (req, res) => {
      // Quien registra ve todas las visitas; el residente solo las suyas.
      const filas = req.permisos.includes('visitas.registrar')
        ? q.visitas.all()
        : q.visitasDe.all(req.usuario.id)
      res.json(filas)
    },
  )

  app.post('/api/visitas', autenticar, exigir('visitas.autorizar'), (req, res) => {
    const visitante = texto(req.body?.visitante)
    const fecha = texto(req.body?.fecha)
    if (!visitante) falla(400, 'Escribe el nombre del visitante.')
    if (!FECHA_VALIDA.test(fecha) || Number.isNaN(Date.parse(fecha))) {
      falla(400, 'Escribe una fecha válida.')
    }
    const id = crypto.randomUUID()
    q.insertarVisita.run(id, visitante, fecha, req.usuario.id)
    anotar(req.usuario.nombre, 'Visita autorizada', `${visitante} para ${req.usuario.casa}`)
    res.status(201).json({ id, visitante, fecha, estado: 'autorizada' })
  })

  const TRANSICIONES = {
    dentro: { desde: 'autorizada', accion: 'Entrada registrada' },
    salio: { desde: 'dentro', accion: 'Salida registrada' },
    cancelada: { desde: 'autorizada', accion: 'Visita cancelada' },
  }

  app.patch(
    '/api/visitas/:id',
    autenticar,
    exigir('visitas.autorizar', 'visitas.registrar'),
    (req, res) => {
      const visita = q.visitaPorId.get(req.params.id) ?? falla(404, 'La visita no existe.')
      const estado = texto(req.body?.estado)
      const transicion = TRANSICIONES[estado] ?? falla(400, 'El estado indicado no es válido.')

      const registra = req.permisos.includes('visitas.registrar')
      const esDueno = visita.residente_id === req.usuario.id
      const permitido = estado === 'cancelada' ? esDueno || registra : registra
      if (!permitido) falla(403, 'No tienes permiso para hacer esto.')
      if (visita.estado !== transicion.desde) {
        falla(409, 'Esa visita ya no admite este cambio.')
      }
      q.estadoVisita.run(estado, visita.id)
      anotar(req.usuario.nombre, transicion.accion, visita.visitante)
      res.json({ id: visita.id, estado })
    },
  )

  // ---------- Bitácora ----------
  app.get('/api/bitacora', autenticar, exigir('bitacora.ver'), (req, res) => {
    res.json(q.bitacora.all(MAX_BITACORA_VISTA))
  })

  // ---------- Recuperación de contraseña ----------
  // La respuesta es la misma exista o no el correo, para no revelar quién tiene cuenta.
  app.post('/api/recuperacion/solicitar', async (req, res) => {
    const usuario = q.usuarioPorCorreo.get(texto(req.body?.correo))
    if (usuario && usuario.activo === 1) {
      const previa = q.recuperacionDe.get(usuario.id)
      if (!previa || ahora() - previa.creada >= REENVIO_MS) {
        const codigo = nuevoCodigo()
        q.guardarRecuperacion.run(
          usuario.id,
          huella(`${usuario.id}:${codigo}`),
          ahora(),
          ahora() + CODIGO_MS,
        )
        anotar(usuario.nombre, 'Recuperación solicitada', usuario.nombre)
        try {
          await enviarCodigo(usuario.correo, codigo)
        } catch (error) {
          console.error('No se pudo entregar el código de recuperación:', error)
        }
      }
    }
    res.json({
      mensaje:
        'Si el correo está registrado, enviamos un código de 6 dígitos válido por 15 minutos.',
    })
  })

  app.post('/api/recuperacion/confirmar', async (req, res) => {
    const correo = texto(req.body?.correo)
    const codigo = texto(req.body?.codigo)
    const nueva = validarPassword(
      req.body?.nueva,
      `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
    )
    const invalido = 'El código no es válido o ya venció.'

    const usuario = q.usuarioPorCorreo.get(correo)
    const registro = usuario && usuario.activo === 1 ? q.recuperacionDe.get(usuario.id) : null
    if (!registro) falla(400, invalido)
    if (registro.expira <= ahora() || registro.intentos >= MAX_INTENTOS) {
      q.borrarRecuperacion.run(usuario.id)
      falla(400, invalido)
    }
    if (!iguales(registro.huella, huella(`${usuario.id}:${codigo}`))) {
      q.sumarIntento.run(usuario.id)
      falla(400, invalido)
    }

    // El código se gasta antes de cifrar, para que no se pueda usar dos veces a la vez.
    q.borrarRecuperacion.run(usuario.id)
    await guardarClave(usuario.id, nueva)
    q.borrarSesionesDe.run(usuario.id)
    anotar(usuario.nombre, 'Contraseña recuperada', usuario.nombre)
    res.json({ mensaje: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.' })
  })

  // ---------- Final ----------
  app.use('/api', (req, res, next) => next(new ErrorHttp(404, 'Ruta no encontrada.')))
  if (carpetaWeb) app.use(express.static(carpetaWeb))

  app.use((error, req, res, _siguiente) => {
    if (error instanceof ErrorHttp) {
      return res.status(error.estado).json({ error: error.message })
    }
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'La solicitud no es un JSON válido.' })
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'La solicitud es demasiado grande.' })
    }
    console.error(error)
    return res.status(500).json({ error: 'Ocurrió un error en el servidor.' })
  })

  return app
}
