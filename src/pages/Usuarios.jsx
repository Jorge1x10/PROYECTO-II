import { useState } from 'react'
import { useApp } from '../context/AppContext'

const FORM_VACIO = { nombre: '', correo: '', password: '', rolId: 'residente', casa: '' }

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
  const puedeGestionar = tiene('usuarios.gestionar')

  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor })
  }

  function enviar(e) {
    e.preventDefault()
    const resultado = crearUsuario(form)
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
                    <td>
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
