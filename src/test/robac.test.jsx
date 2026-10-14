import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'

async function entrar(user, correo, password) {
  await user.type(screen.getByLabelText('Correo'), correo)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

beforeEach(() => {
  localStorage.clear()
  window.location.hash = '#/login'
})

describe('Sprint 1 · acceso y roles', () => {
  it('rechaza credenciales incorrectas', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'admin@robac.mx', 'mala')
    expect(await screen.findByRole('alert')).toHaveTextContent('incorrectos')
  })

  it('no deja entrar a una cuenta desactivada', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'mario@robac.mx', 'mario123')
    expect(await screen.findByRole('alert')).toHaveTextContent('desactivada')
  })

  it('el administrador ve todo el menú', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'admin@robac.mx', 'admin123')
    const menu = await screen.findByRole('navigation', { name: 'Principal' })
    for (const texto of ['Usuarios', 'Roles y permisos', 'Visitas', 'Bitácora']) {
      expect(within(menu).getByText(texto)).toBeInTheDocument()
    }
  })

  it('el residente solo ve Inicio y Visitas, y no entra a /usuarios', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'residente@robac.mx', 'residente123')
    const menu = await screen.findByRole('navigation', { name: 'Principal' })
    expect(within(menu).getByText('Visitas')).toBeInTheDocument()
    expect(within(menu).queryByText('Usuarios')).not.toBeInTheDocument()
    expect(within(menu).queryByText('Bitácora')).not.toBeInTheDocument()

    window.location.hash = '#/usuarios'
    expect(
      await screen.findByText('No tienes acceso a esta sección'),
    ).toBeInTheDocument()
  })
})

describe('Sprint 2 · gestión y visitas', () => {
  it('el administrador crea un usuario y no permite correos repetidos', async () => {
    const user = userEvent.setup()
    render(<App />)
    await entrar(user, 'admin@robac.mx', 'admin123')
    await user.click(await screen.findByText('Usuarios'))

    const formulario = (await screen.findByText('Nuevo usuario')).closest('form')
    const llenar = async (correo) => {
      await user.type(within(formulario).getByLabelText('Nombre'), 'Luis Nuevo')
      await user.type(within(formulario).getByLabelText('Correo'), correo)
      await user.type(
        within(formulario).getByLabelText('Contraseña temporal'),
        'clave123',
      )
      await user.click(
        within(formulario).getByRole('button', { name: 'Crear usuario' }),
      )
    }

    await llenar('luis@robac.mx')
    expect(await screen.findByText('luis@robac.mx')).toBeInTheDocument()

    await llenar('luis@robac.mx')
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe')
  })

  it('flujo completo de una visita: autorizar → entrada → salida, con bitácora', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    // El residente autoriza una visita
    await entrar(user, 'residente@robac.mx', 'residente123')
    await user.click(await screen.findByText('Visitas'))
    await user.type(await screen.findByLabelText('Nombre del visitante'), 'Pedro Pérez')
    await user.click(screen.getByRole('button', { name: 'Autorizar visita' }))
    expect(await screen.findByText('Pedro Pérez')).toBeInTheDocument()
    expect(screen.getByText('Por llegar')).toBeInTheDocument()
    unmount()

    // El guardia registra entrada y salida
    window.location.hash = '#/login'
    localStorage.removeItem('robac-sesion')
    render(<App />)
    await entrar(user, 'guardia@robac.mx', 'guardia123')
    await user.click(await screen.findByText('Visitas'))
    await user.click(await screen.findByRole('button', { name: 'Registrar entrada' }))
    expect(await screen.findByText('Dentro')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Registrar salida' }))
    expect(await screen.findByText('Salió')).toBeInTheDocument()

    // La bitácora conserva los movimientos
    await user.click(screen.getByText('Bitácora'))
    expect(await screen.findByText('Entrada registrada')).toBeInTheDocument()
    expect(screen.getByText('Salida registrada')).toBeInTheDocument()
    expect(screen.getByText('Visita autorizada')).toBeInTheDocument()
  })

  it('al retirar un permiso a un rol, desaparece su acceso', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await entrar(user, 'admin@robac.mx', 'admin123')
    await user.click(await screen.findByText('Roles y permisos'))
    await user.click(
      await screen.findByLabelText('Consultar la bitácora de accesos para Guardia'),
    )
    unmount()

    window.location.hash = '#/login'
    localStorage.removeItem('robac-sesion')
    render(<App />)
    await entrar(user, 'guardia@robac.mx', 'guardia123')
    const menu = await screen.findByRole('navigation', { name: 'Principal' })
    expect(within(menu).queryByText('Bitácora')).not.toBeInTheDocument()
  })
})
