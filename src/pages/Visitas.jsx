import { useState } from 'react'
import { useApp } from '../context/AppContext'

const ESTADOS = {
  autorizada: 'Por llegar',
  dentro: 'Dentro',
  salio: 'Salió',
  cancelada: 'Cancelada',
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

export default function Visitas() {
  const { visitas, usuarios, usuario, tiene, autorizarVisita, cambiarEstadoVisita } =
    useApp()
  const [visitante, setVisitante] = useState('')
  const [fecha, setFecha] = useState(hoy())

  const puedeAutorizar = tiene('visitas.autorizar')
  const puedeRegistrar = tiene('visitas.registrar')

  // Quien registra ve todas las visitas; el residente solo las suyas.
  const lista = puedeRegistrar
    ? visitas
    : visitas.filter((v) => v.residenteId === usuario.id)

  function enviar(e) {
    e.preventDefault()
    autorizarVisita({ visitante, fecha })
    setVisitante('')
  }

  function nombreResidente(id) {
    const u = usuarios.find((x) => x.id === id)
    return u ? `${u.nombre} (${u.casa})` : 'Desconocido'
  }

  return (
    <>
      <h1>Visitas</h1>

      {puedeAutorizar && (
        <form className="tarjeta formulario" onSubmit={enviar}>
          <h2>Autorizar una visita</h2>
          <label>
            Nombre del visitante
            <input
              value={visitante}
              onChange={(e) => setVisitante(e.target.value)}
              required
            />
          </label>
          <label>
            Fecha de la visita
            <input
              type="date"
              value={fecha}
              min={hoy()}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </label>
          <button type="submit">Autorizar visita</button>
        </form>
      )}

      {lista.length === 0 ? (
        <p className="suave">Todavía no hay visitas registradas.</p>
      ) : (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Visitante</th>
                <th>Residente</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => (
                <tr key={v.id}>
                  <td>{v.visitante}</td>
                  <td>{nombreResidente(v.residenteId)}</td>
                  <td>{v.fecha}</td>
                  <td>{ESTADOS[v.estado]}</td>
                  <td className="acciones">
                    {puedeRegistrar && v.estado === 'autorizada' && (
                      <button type="button" onClick={() => cambiarEstadoVisita(v.id, 'dentro')}>
                        Registrar entrada
                      </button>
                    )}
                    {puedeRegistrar && v.estado === 'dentro' && (
                      <button type="button" onClick={() => cambiarEstadoVisita(v.id, 'salio')}>
                        Registrar salida
                      </button>
                    )}
                    {v.estado === 'autorizada' &&
                      (v.residenteId === usuario.id || puedeRegistrar) && (
                        <button
                          type="button"
                          className="secundario"
                          onClick={() => cambiarEstadoVisita(v.id, 'cancelada')}
                        >
                          Cancelar
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
