import { useApp } from '../context/AppContext'

export default function Roles() {
  const { roles, permisos, alternarPermiso } = useApp()

  return (
    <>
      <h1>Roles y permisos</h1>
      <p className="suave">
        Marca qué puede hacer cada rol. Los cambios se aplican de inmediato.
      </p>

      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Permiso</th>
              {roles.map((r) => (
                <th key={r.id}>
                  {r.nombre}
                  <br />
                  <span className="suave">
                    {r.usuarios} usuario(s)
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permisos.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td>
                {roles.map((r) => {
                  // El administrador siempre conserva este permiso para no quedarse sin acceso.
                  const bloqueado = r.id === 'admin' && p.id === 'roles.gestionar'
                  return (
                    <td key={r.id} className="centro">
                      <input
                        type="checkbox"
                        aria-label={`${p.nombre} para ${r.nombre}`}
                        checked={r.permisos.includes(p.id)}
                        disabled={bloqueado}
                        onChange={() => alternarPermiso(r.id, p.id)}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
