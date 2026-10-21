import { useApp } from '../context/AppContext'

export default function Dashboard() {
  const { usuario, rol, tiene, usuarios, visitas, permisos } = useApp()

  const activos = usuarios.filter((u) => u.activo).length
  const dentro = visitas.filter((v) => v.estado === 'dentro').length
  const pendientes = visitas.filter((v) => v.estado === 'autorizada').length

  return (
    <>
      <h1>Hola, {usuario.nombre}</h1>
      <p className="suave">Tu rol es {rol.nombre}.</p>

      <div className="resumen">
        {tiene('usuarios.ver') && (
          <div className="dato">
            <strong>{activos}</strong>
            <span>usuarios activos</span>
          </div>
        )}
        {tiene(['visitas.registrar', 'visitas.autorizar']) && (
          <>
            <div className="dato">
              <strong>{pendientes}</strong>
              <span>visitas por llegar</span>
            </div>
            <div className="dato">
              <strong>{dentro}</strong>
              <span>visitas dentro ahora</span>
            </div>
          </>
        )}
      </div>

      <section className="tarjeta">
        <h2>Lo que puedes hacer</h2>
        {rol.permisos.length === 0 ? (
          <p className="suave">Tu rol no tiene permisos asignados.</p>
        ) : (
          <ul>
            {permisos.filter((p) => rol.permisos.includes(p.id)).map((p) => (
              <li key={p.id}>{p.nombre}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
