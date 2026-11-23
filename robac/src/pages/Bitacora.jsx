import { useEffect, useState } from 'react'
import { pedir } from '../api/client'

const POR_PAGINA = 50 // la misma cantidad que entrega el servidor

function formatearFecha(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

// Convierte un día del calendario (AAAA-MM-DD) en el instante en que empieza en la hora local.
function inicioDelDia(dia, diasDespues = 0) {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(a, m - 1, d + diasDespues).toISOString()
}

export default function Bitacora() {
  const [buscar, setBuscar] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(1)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  const fechasAlReves = desde && hasta && desde > hasta

  useEffect(() => {
    if (fechasAlReves) return undefined
    let vigente = true
    const params = new URLSearchParams({ pagina: String(pagina) })
    if (buscar.trim()) params.set('buscar', buscar.trim())
    if (desde) params.set('desde', inicioDelDia(desde))
    if (hasta) params.set('hasta', inicioDelDia(hasta, 1))
    pedir(`/bitacora?${params}`)
      .then((r) => {
        if (!vigente) return
        setResultado(r)
        setError('')
      })
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [buscar, desde, hasta, pagina, fechasAlReves])

  // Cualquier cambio de filtro vuelve a la primera página.
  const filtrar = (cambiar) => (e) => {
    cambiar(e.target.value)
    setPagina(1)
  }

  const movimientos = resultado?.movimientos ?? []
  const primero = resultado ? (resultado.pagina - 1) * POR_PAGINA + 1 : 0

  return (
    <>
      <h1>Bitácora de accesos</h1>

      <div className="filtros">
        <label>
          Buscar
          <input
            value={buscar}
            onChange={filtrar(setBuscar)}
            placeholder="Persona, acción o detalle"
          />
        </label>
        <label>
          Desde
          <input type="date" value={desde} onChange={filtrar(setDesde)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} onChange={filtrar(setHasta)} />
        </label>
      </div>

      {fechasAlReves && (
        <p className="error" role="alert">
          La fecha «Desde» debe ser anterior o igual a «Hasta».
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {resultado &&
        !fechasAlReves &&
        (movimientos.length === 0 ? (
          <p className="suave">No hay movimientos que coincidan.</p>
        ) : (
          <>
            <p className="suave">
              Movimientos {primero} a {primero + movimientos.length - 1} de {resultado.total}
            </p>
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
                  {movimientos.map((b) => (
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
            {resultado.paginas > 1 && (
              <div className="paginacion">
                <button
                  type="button"
                  className="secundario"
                  onClick={() => setPagina((p) => p - 1)}
                  disabled={resultado.pagina <= 1}
                >
                  Más recientes
                </button>
                <span>
                  Página {resultado.pagina} de {resultado.paginas}
                </span>
                <button
                  type="button"
                  className="secundario"
                  onClick={() => setPagina((p) => p + 1)}
                  disabled={resultado.pagina >= resultado.paginas}
                >
                  Más antiguos
                </button>
              </div>
            )}
          </>
        ))}
    </>
  )
}
