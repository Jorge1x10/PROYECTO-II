import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { configurarBase } from '../api/client'
import { crearServidorDePrueba } from '../../server/ayudas-prueba.js'

// Las pruebas de pantallas usan el servidor real de ROBAC con una base de datos nueva en
// memoria; así se prueba todo el recorrido: React, la API y la base de datos.
// (Las pruebas del servidor corren en entorno Node y no usan esto.)
let servidor

beforeEach(async () => {
  if (typeof window === 'undefined') return
  servidor = await crearServidorDePrueba()
  configurarBase(servidor.url)
  globalThis.servidorDePrueba = servidor
  localStorage.clear()
  window.location.hash = '#/login'
})

afterEach(async () => {
  if (typeof window === 'undefined') return
  await servidor?.cerrar()
  servidor = null
})
