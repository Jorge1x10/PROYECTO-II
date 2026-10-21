import { useState } from 'react'
import { useApp } from '../context/AppContext'

const FORM_VACIO = { nombre: '', correo: '', password: '', rolId: 'residente', casa: '' }

// Tarjeta para editar los datos de un usuario o restablecer su contraseña.
function EditarUsuario({ objetivo, onCerrar }) {
  const { editarUsuario, restablecerPassword } = useApp()
  const [datos, setDatos] = useState({
    nombre: objetivo.nombre,
    correo: objetivo.correo,
    casa: objetivo.casa === '—' ? '' : objetivo.casa,
  })
  const [temporal, setTemporal] = useState('')
  const [errorDatos, setErrorDatos] = useState('')
  const [errorClave, setErrorClave] = useState('')
  const [avisoClave, setAvisoClave] = useState('')

  async function guardar(e) {
    e.preventDefault()
    const resultado = await editarUsuario(objetivo.id, datos)
    if (resultado.ok) onCerrar()
    else setErrorDatos(resultado.error)
  }

  async function restablecer(e) {
    e.preventDefault()
    const resultado = await restablecerPassword(objetivo.id, temporal)
    if (resultado.ok) {
      setTemporal('')
      setErrorClave('')
      setAvisoClave('Contraseña restablecida. Compártela con la persona de forma segura.')
    } else {
      setAvisoClave('')
      setErrorClave(resultado.error)
    }
  }

  return (
    <section className="tarjeta" aria-label={`Editar a ${objetivo.nombre}`}>
      <h2>Editar a {objetivo.nombre}</h2>

      <form className="formulario" onSubmit={guardar}>
        <label>
          Nombre
          <input
            value={datos.nombre}
            onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
            required
          />
        </label>
        <label>
          Correo
          <input
            type="email"
            value={datos.correo}
            onChange={(e) => setDatos({ ...datos, correo: e.target.value })}
            required
          />
        </label>
        <label>
          Casa
          <input
            value={datos.casa}
            onChange={(e) => setDatos({ ...datos, casa: e.target.value })}
          />
        </label>
        {errorDatos && (
          <p className="error" role="alert">
            {errorDatos}
          </p>
        )}
        <div className="acciones">
          <button type="submit">Guardar cambios</button>
          <button type="button" className="secundario" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </form>

      <form className="formulario separado" onSubmit={restablecer}>
        <label>
          Contraseña temporal
          <input
            type="password"
            value={temporal}
            onChange={(e) => setTemporal(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        {errorClave && (
          <p className="error" role="alert">
            {errorClave}
          </p>
        )}
        {avisoClave && (
          <p className="exito" role="status">
            {avisoClave}
          </p>
        )}
        <div className="acciones">
          <button type="submit" className="secundario">
            Restablecer contraseña
          </button>
        </div>
      </form>
    </section>
  )
}

export default function Usuarios() {
  const {
    usuarios,
    roles,
    usuario: actual,
    tiene,
    crearUsuario,
    cambiarRolUsuario,
    alternarActivo,
  } = useApp()
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const puedeGestionar = tiene('usuarios.gestionar')
  const editando = usuarios.find((u) => u.id === editandoId)

  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor })
  }

  async function enviar(e) {
    e.preventDefault()
    const resultado = await crearUsuario(form)
    if (resultado.ok) {
      setForm(FORM_VACIO)
      setError('')
    } else {
      setError(resultado.error)
    }
  }

  return (
    <>
      <h1>Usuarios</h1>

      {puedeGestionar && (
        <form className="tarjeta formulario" onSubmit={enviar}>
          <h2>Nuevo usuario</h2>
          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => cambiar('nombre', e.target.value)}
              required
            />
          </label>
          <label>
            Correo
            <input
              type="email"
              value={form.correo}
              onChange={(e) => cambiar('correo', e.target.value)}
              required
            />
          </label>
          <label>
            Contraseña temporal
            <input
              type="password"
              value={form.password}
              onChange={(e) => cambiar('password', e.target.value)}
              minLength={6}
              required
            />
          </label>
          <label>
            Rol
            <select
              value={form.rolId}
              onChange={(e) => cambiar('rolId', e.target.value)}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Casa
            <input
              value={form.casa}
              onChange={(e) => cambiar('casa', e.target.value)}
              placeholder="Casa 12"
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button type="submit">Crear usuario</button>
        </form>
      )}

      {puedeGestionar && editando && (
        <EditarUsuario
          key={editando.id}
          objetivo={editando}
          onCerrar={() => setEditandoId(null)}
        />
      )}

      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Casa</th>
              <th>Rol</th>
              <th>Estado</th>
              {puedeGestionar && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const esYo = u.id === actual.id
              return (
                <tr key={u.id}>
                  <td>{u.nombre}</td>
                  <td>{u.correo}</td>
                  <td>{u.casa}</td>
                  <td>
                    {puedeGestionar && !esYo ? (
                      <select
                        aria-label={`Rol de ${u.nombre}`}
                        value={u.rolId}
                        onChange={(e) => cambiarRolUsuario(u.id, e.target.value)}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nombre}
                          </option>
                        ))}
                      </select>
                    ) : (
                      roles.find((r) => r.id === u.rolId)?.nombre
                    )}
                  </td>
                  <td>
                    <span className={u.activo ? 'etiqueta ok' : 'etiqueta off'}>
                      {u.activo ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  {puedeGestionar && (
                    <td className="acciones">
                      <button
                        type="button"
                        className="secundario"
                        aria-label={`Editar a ${u.nombre}`}
                        onClick={() => setEditandoId(u.id)}
                      >
                        Editar
                      </button>
                      {esYo ? (
                        <span className="suave">Tu cuenta</span>
                      ) : (
                        <button
                          type="button"
                          className="secundario"
                          onClick={() => alternarActivo(u.id)}
                        >
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
