import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function Login() {
  const { usuario, iniciarSesion } = useApp()
  const navegar = useNavigate()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (usuario) return <Navigate to="/" replace />

  function enviar(e) {
    e.preventDefault()
    const resultado = iniciarSesion(correo, password)
    if (resultado.ok) navegar('/')
    else setError(resultado.error)
  }

  return (
    <div className="login">
      <form className="tarjeta" onSubmit={enviar}>
        <h1>ROBAC</h1>
        <p className="suave">Control de acceso para tu comunidad</p>

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
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit">Iniciar sesión</button>

        <details className="demo">
          <summary>Cuentas de prueba</summary>
          <ul>
            <li>admin@robac.mx / admin123</li>
            <li>guardia@robac.mx / guardia123</li>
            <li>residente@robac.mx / residente123</li>
          </ul>
        </details>
      </form>
    </div>
  )
}
