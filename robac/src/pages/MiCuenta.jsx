import { useState } from 'react'
import { useApp } from '../context/AppContext'

const FORM_VACIO = { actual: '', nueva: '', confirmar: '' }

export default function MiCuenta() {
  const { usuario, rol, cambiarMiPassword } = useApp()
  const [form, setForm] = useState(FORM_VACIO)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor })
    setExito(false)
  }

  async function enviar(e) {
    e.preventDefault()
    if (form.nueva !== form.confirmar) {
      setError('La confirmación no coincide con la nueva contraseña.')
      return
    }
    const resultado = await cambiarMiPassword(form.actual, form.nueva)
    if (resultado.ok) {
      setForm(FORM_VACIO)
      setError('')
      setExito(true)
    } else {
      setError(resultado.error)
    }
  }

  return (
    <>
      <h1>Mi cuenta</h1>

      <section className="tarjeta">
        <h2>Mis datos</h2>
        <p>
          <strong>{usuario.nombre}</strong>
          <br />
          {usuario.correo} · {rol.nombre}
          {usuario.casa !== '—' && ` · ${usuario.casa}`}
        </p>
      </section>

      <form className="tarjeta formulario" onSubmit={enviar}>
        <h2>Cambiar contraseña</h2>
        <label>
          Contraseña actual
          <input
            type="password"
            value={form.actual}
            onChange={(e) => cambiar('actual', e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          Nueva contraseña
          <input
            type="password"
            value={form.nueva}
            onChange={(e) => cambiar('nueva', e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <label>
          Confirmar nueva contraseña
          <input
            type="password"
            value={form.confirmar}
            onChange={(e) => cambiar('confirmar', e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {exito && (
          <p className="exito" role="status">
            Tu contraseña se cambió correctamente.
          </p>
        )}
        <button type="submit">Cambiar contraseña</button>
      </form>
    </>
  )
}
