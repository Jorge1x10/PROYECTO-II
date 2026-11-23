import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'

async function entrar(user, correo, password) {
  await user.type(screen.getByLabelText('Correo'), correo)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('Sprint 6 · pantallas', () => {
  it('muestra las cuentas de prueba solo si el servidor las tiene', async () => {
    render(<App />)
    expect(await screen.findByText('Cuentas de prueba')).toBeInTheDocument()
  })

  it('la bitácora se busca en todo el historial y se recorre por páginas', async () => {
    const insertar = globalThis.servidorDePrueba.db.prepare(
      'INSERT INTO bitacora (fecha, actor, accion, detalle) VALUES (?, ?, ?, ?)',
    )
    insertar.run('2026-01-05T15:00:00.000Z', 'Gustavo Guardia', 'Entrada registrada', 'Visita antigua')
    for (let i = 0; i < 60; i += 1) {
      insertar.run(new Date().toISOString(), 'Sistema', 'Prueba', `movimiento ${i}`)
    }

    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'guardia@robac.mx', 'guardia123')
    await user.click(await screen.findByRole('link', { name: 'Bitácora' }))

    expect(await screen.findByText('Movimientos 1 a 50 de 62')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Más antiguos' }))
    expect(await screen.findByText('Movimientos 51 a 62 de 62')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument()

    // La búsqueda encuentra un movimiento que ya no estaba en la primera página.
    await user.type(screen.getByLabelText('Buscar'), 'antigua')
    expect(await screen.findByText('Movimientos 1 a 1 de 1')).toBeInTheDocument()
    const fila = screen.getByText('Visita antigua').closest('tr')
    expect(within(fila).getByText('Entrada registrada')).toBeInTheDocument()

    // Un rango de fechas que no incluye ese día no devuelve nada.
    await user.type(screen.getByLabelText('Desde'), '2026-02-01')
    expect(await screen.findByText('No hay movimientos que coincidan.')).toBeInTheDocument()
  })

  it('avisa si el rango de fechas está al revés', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'admin@robac.mx', 'admin123')
    await user.click(await screen.findByRole('link', { name: 'Bitácora' }))
    await user.type(await screen.findByLabelText('Desde'), '2026-11-20')
    await user.type(screen.getByLabelText('Hasta'), '2026-11-10')
    expect(await screen.findByRole('alert')).toHaveTextContent('anterior o igual')
  })
})
