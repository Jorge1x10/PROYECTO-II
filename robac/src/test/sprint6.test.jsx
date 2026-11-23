import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('Sprint 6 · pantallas', () => {
  it('muestra las cuentas de prueba solo si el servidor las tiene', async () => {
    render(<App />)
    expect(await screen.findByText('Cuentas de prueba')).toBeInTheDocument()
  })
})
