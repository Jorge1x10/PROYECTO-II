import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('Sprint 5 · intentos fallidos en la pantalla de inicio de sesión', () => {
  it('tras 5 contraseñas incorrectas avisa del bloqueo y ofrece recuperar la contraseña', async () => {
    const user = userEvent.setup()
    render(<App />)
    const correo = screen.getByLabelText('Correo')
    const password = screen.getByLabelText('Contraseña')
    const boton = screen.getByRole('button', { name: 'Iniciar sesión' })

    await user.type(correo, 'guardia@robac.mx')
    for (let i = 1; i <= 4; i++) {
      await user.clear(password)
      await user.type(password, `equivocada${i}`)
      await user.click(boton)
      expect(await screen.findByRole('alert')).toHaveTextContent('incorrectos')
    }
    await user.clear(password)
    await user.type(password, 'equivocada5')
    await user.click(boton)
    expect(await screen.findByText(/Demasiados intentos fallidos/)).toBeInTheDocument()

    // Ni la contraseña correcta entra mientras dura el bloqueo.
    await user.clear(password)
    await user.type(password, 'guardia123')
    await user.click(boton)
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos fallidos')
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeInTheDocument()
  })
})
