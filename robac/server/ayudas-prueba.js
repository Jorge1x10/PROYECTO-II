// Servidor de prueba: base de datos en memoria, puerto libre, reloj controlable
// y un buzón falso donde caen los códigos de recuperación.
import { crearApp } from './app.js'
import { abrirBase } from './db.js'

const ITERACIONES_PRUEBA = 1000

export async function crearServidorDePrueba({ ruta = ':memory:', ...opciones } = {}) {
  const db = await abrirBase(ruta, { iteraciones: ITERACIONES_PRUEBA })
  const codigos = []
  const reloj = { ahora: Date.now() }
  const app = crearApp({
    db,
    iteraciones: ITERACIONES_PRUEBA,
    enviarCodigo: (correo, codigo) => codigos.push({ correo, codigo }),
    ahora: () => reloj.ahora,
    ...opciones,
  })
  const servidor = await new Promise((resolver) => {
    const s = app.listen(0, '127.0.0.1', () => resolver(s))
  })
  return {
    url: `http://127.0.0.1:${servidor.address().port}`,
    db,
    codigos,
    reloj,
    cerrar: () =>
      new Promise((resolver) => {
        servidor.closeAllConnections?.()
        servidor.close(() => {
          db.close()
          resolver()
        })
      }),
  }
}
