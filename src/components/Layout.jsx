import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

// Cada enlace del menú declara el permiso que necesita para mostrarse.
const ENLACES = [
  { a: '/', texto: 'Inicio', permiso: null },
  { a: '/usuarios', texto: 'Usuarios', permiso: 'usuarios.ver' },
  { a: '/roles', texto: 'Roles y permisos', permiso: 'roles.gestionar' },
  {
    a: '/visitas',
    texto: 'Visitas',
    permiso: ['visitas.autorizar', 'visitas.registrar'],
  },
  { a: '/bitacora', texto: 'Bitácora', permiso: 'bitacora.ver' },
]

export default function Layout() {
  const { usuario, rol, tiene, cerrarSesion } = useApp()
  const navegar = useNavigate()

  function salir() {
    cerrarSesion()
    navegar('/login')
  }

  return (
    <div className="app">
      <header className="barra">
        <span className="marca">ROBAC</span>
        <nav className="menu" aria-label="Principal">
          {ENLACES.filter((e) => !e.permiso || tiene(e.permiso)).map((e) => (
            <NavLink key={e.a} to={e.a} end={e.a === '/'}>
              {e.texto}
            </NavLink>
          ))}
        </nav>
        <div className="sesion">
          <span>
            {usuario.nombre} · <strong>{rol.nombre}</strong>
          </span>
          <button type="button" className="secundario" onClick={salir}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  )
}
