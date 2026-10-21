import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Usuarios from './pages/Usuarios'
import Roles from './pages/Roles'
import Visitas from './pages/Visitas'
import Bitacora from './pages/Bitacora'
import MiCuenta from './pages/MiCuenta'
import NoAutorizado from './pages/NoAutorizado'
import Recuperar from './pages/Recuperar'

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar" element={<Recuperar />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route
              path="usuarios"
              element={
                <ProtectedRoute permiso="usuarios.ver">
                  <Usuarios />
                </ProtectedRoute>
              }
            />
            <Route
              path="roles"
              element={
                <ProtectedRoute permiso="roles.gestionar">
                  <Roles />
                </ProtectedRoute>
              }
            />
            <Route
              path="visitas"
              element={
                <ProtectedRoute permiso={['visitas.autorizar', 'visitas.registrar']}>
                  <Visitas />
                </ProtectedRoute>
              }
            />
            <Route
              path="bitacora"
              element={
                <ProtectedRoute permiso="bitacora.ver">
                  <Bitacora />
                </ProtectedRoute>
              }
            />
            <Route path="cuenta" element={<MiCuenta />} />
            <Route path="no-autorizado" element={<NoAutorizado />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}
