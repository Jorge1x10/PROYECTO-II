import { useState } from 'react'
import { Link } from 'react-router-dom'
import { pedir } from '../api/client'

// Recuperación de contraseña en dos pasos: 1) pedir el código, 2) escribirlo con la nueva contraseña.
export default function Recuperar() {
  const [paso, setPaso] = useState('solicitar')
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function solicitar(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      const r = await pedir('/recuperacion/solicitar', { metodo: 'POST', cuerpo: { correo } })
      setAviso(r.mensaje)
      setError('')
      setPaso('confirmar')
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function confirmarCambio(e) {
    e.preventDefault()
    if (nueva !== confirmar) {
      setError('La confirmación no coincide con la nueva contraseña.')
      return
    }
    setEnviando(true)
    try {
      const r = await pedir('/recuperacion/confirmar', {
        metodo: 'POST',
        cuerpo: { correo, codigo, nueva },
      })
      setAviso(r.mensaje)
      setError('')
      setPaso('listo')
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <div className="tarjeta">
        <h1>Recuperar contraseña</h1>

        {paso === 'solicitar' && (
          <form className="pasos" onSubmit={solicitar}>
            <p className="suave">
              Escribe tu correo y te daremos un código de 6 dígitos para crear una contraseña nueva.
            </p>
            <label>
              Correo
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" disabled={enviando}>
              Enviar código
            </button>
          </form>
        )}

        {paso === 'confirmar' && (
          <form className="pasos" onSubmit={confirmarCambio}>
            <p className="exito" role="status">
              {aviso}
            </p>
            <label>
              Correo
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Código de 6 dígitos
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
              />
            </label>
            <label>
              Nueva contraseña
              <input
                type="password"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            <label>
              Confirmar nueva contraseña
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" disabled={enviando}>
              Guardar nueva contraseña
            </button>
          </form>
        )}

        {paso === 'listo' && (
          <p className="exito" role="status">
            {aviso}
          </p>
        )}

        <Link to="/login">Volver a iniciar sesión</Link>
      </div>
    </div>
  )
}
