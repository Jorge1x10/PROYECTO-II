import { Link } from 'react-router-dom'

export default function NoAutorizado() {
  return (
    <>
      <h1>No tienes acceso a esta sección</h1>
      <p className="suave">
        Tu rol no incluye el permiso necesario. Si lo necesitas, pídeselo al
        administrador.
      </p>
      <Link to="/">Volver al inicio</Link>
    </>
  )
}
