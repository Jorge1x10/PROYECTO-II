import { useState } from 'react'
import { useApp } from '../context/AppContext'

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function Bitacora() {
  const { bitacora } = useApp()
  const [filtro, setFiltro] = useState('')

  const texto = filtro.trim().toLowerCase()
  const filas = bitacora.filter((b) =>
    `${b.actor} ${b.accion} ${b.detalle}`.toLowerCase().includes(texto),
  )

  return (
    <>
      <h1>Bitácora de accesos</h1>
      <p className="suave">Se conservan los últimos 200 movimientos.</p>

      <label className="filtro">
        Buscar
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Persona, acción o detalle"
        />
      </label>

      {filas.length === 0 ? (
        <p className="suave">No hay movimientos que coincidan.</p>
      ) : (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Quién</th>
                <th>Acción</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((b) => (
                <tr key={b.id}>
                  <td>{formatearFecha(b.fecha)}</td>
                  <td>{b.actor}</td>
                  <td>{b.accion}</td>
                  <td>{b.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
