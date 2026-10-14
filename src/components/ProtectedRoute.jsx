import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

// Protege una ruta: exige sesión y, si se indica, al menos uno de los permisos.
export default function ProtectedRoute({ permiso, children }) {
  const { usuario, tiene } = useApp()

  if (!usuario) return <Navigate to="/login" replace />
  if (permiso && !tiene(permiso)) return <Navigate to="/no-autorizado" replace />

  return children
}
