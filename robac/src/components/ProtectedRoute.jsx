import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

// Protege una ruta: exige sesión y, si se indica, al menos uno de los permisos.
// El servidor vuelve a comprobar todo; esto solo evita mostrar pantallas que no corresponden.
export default function ProtectedRoute({ permiso, children }) {
  const { usuario, tiene, cargando } = useApp()

  if (cargando) {
    return (
      <p className="suave carga" role="status">
        Cargando…
      </p>
    )
  }
  if (!usuario) return <Navigate to="/login" replace />
  if (permiso && !tiene(permiso)) return <Navigate to="/no-autorizado" replace />

  return children
}
